import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  getBlob,
  deleteObject,
  connectStorageEmulator,
} from "firebase/storage";
import { boardBytes, publishSnapshot, uid, appendLiveRow } from "./model";
export const firebaseConfig = {
  apiKey: "AIzaSyBW6rdJqvrYW2eQwo7QsAxfpczf66I027Y",
  authDomain: "maiboard-d0af8.firebaseapp.com",
  projectId: "maiboard-d0af8",
  storageBucket: "maiboard-d0af8.firebasestorage.app",
  messagingSenderId: "606822562670",
  appId: "1:606822562670:web:1b3194f571841fb2a81f7f",
};
export const app = initializeApp(firebaseConfig),
  auth = getAuth(app),
  db = getFirestore(app),
  storage = getStorage(app);
storage.maxUploadRetryTime = 20000;
storage.maxOperationRetryTime = 15000;
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
const projectRef = (userId, id) => doc(db, "users", userId, "projects", id);
export function watchProjects(userId, next, error) {
  return onSnapshot(
    collection(db, "users", userId, "projects"),
    (s) =>
      next(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.updatedAt?.toMillis?.() || 0) -
              (a.updatedAt?.toMillis?.() || 0),
          ),
      ),
    error,
  );
}
export async function createProject(userId, board) {
  if (boardBytes(board) > 800000)
    throw Error("This board is larger than 800 KB.");
  const id = uid();
  await setDoc(projectRef(userId, id), {
    name: board.name,
    boardJson: JSON.stringify(board),
    blockCount: board.blocks.length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publicationId: null,
  });
  return id;
}
export async function loadProject(userId, id) {
  const snap = await getDoc(projectRef(userId, id));
  if (!snap.exists())
    throw Error("This project does not exist or has been deleted.");
  return { id: snap.id, ...snap.data() };
}
export async function addLiveTableRow(userId,id,blockId,values,columnIds) {
  if(auth.currentUser?.uid!==userId)throw Error('Sign in as the project owner to add rows.');
  return runTransaction(db,async transaction=>{
    const target=projectRef(userId,id),snapshot=await transaction.get(target);
    if(!snapshot.exists())throw Error('This project is unavailable for your account.');
    const board=appendLiveRow(JSON.parse(snapshot.data().boardJson),blockId,values,columnIds);
    if(boardBytes(board)>800000)throw Error('This board is too large to save another row.');
    transaction.update(target,{boardJson:JSON.stringify(board),updatedAt:serverTimestamp()});
    return board;
  });
}
export async function saveProject(userId, id, board) {
  if (boardBytes(board) > 800000)
    throw Error(
      "This board is larger than 800 KB. Split large tables into another project before saving.",
    );
  await setDoc(
    projectRef(userId, id),
    {
      name: board.name,
      boardJson: JSON.stringify(board),
      blockCount: board.blocks.length,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
export async function uploadCSV(userId, projectId, file) {
  const id = uid(),
    path = `users/${userId}/projects/${projectId}/csv/${id}.csv`;
  await uploadBytes(ref(storage, path), file, { contentType: "text/csv" });
  return { path, name: file.name, size: file.size };
}
export async function downloadCSV(csv) {
  const blob = await getBlob(ref(storage, csv.path));
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = csv.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function removeCSV(csv) {
  if (csv?.path) await deleteObject(ref(storage, csv.path));
}
export async function publishProject(userId, projectId, board, existingId) {
  const id = existingId || uid(),
    snapshot = publishSnapshot(board);
  if (boardBytes(snapshot) > 800000)
    throw Error("This board is too large to publish. Reduce its table data.");
  const batch = writeBatch(db);
  batch.set(doc(db, "publications", id), {
    ownerUid: userId,
    projectId,
    name: board.name,
    boardJson: JSON.stringify(snapshot),
    publishedAt: serverTimestamp(),
  });
  batch.update(projectRef(userId, projectId), { publicationId: id });
  await batch.commit();
  return id;
}
export async function unpublishProject(userId, projectId, id) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "publications", id));
  batch.update(projectRef(userId, projectId), { publicationId: null });
  await batch.commit();
}
export async function getPublication(id) {
  const s = await getDoc(doc(db, "publications", id));
  if (!s.exists())
    throw Error(
      "This presentation is unavailable. It may have been unpublished.",
    );
  return s.data();
}
export async function removeProject(userId, project) {
  const board = JSON.parse(project.boardJson),
    files = [
      ...(board.csvFiles ||
        board.blocks.filter((b) => b.csv).map((b) => b.csv)),
      ...(board.imageFiles || []),
    ];
  for (const csv of files) {
    try {
      await removeCSV(csv);
    } catch (e) {
      if (e.code !== "storage/object-not-found") throw e;
    }
  }
  const batch = writeBatch(db);
  if (project.publicationId)
    batch.delete(doc(db, "publications", project.publicationId));
  batch.delete(projectRef(userId, project.id));
  await batch.commit();
}

export async function uploadImage(userId, projectId, file) {
  const path = `users/${userId}/projects/${projectId}/images/${uid()}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return { src: await getDownloadURL(ref(storage, path)), path };
}
