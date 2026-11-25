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
  getDocs, query, where, Timestamp,
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
import { sharingSettings, emailKey, baseBoard, mergeEntries, rowAudience, withAudit, AUDIT_BY, AUDIT_ON } from './collaboration';
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
const loadedEntries=new Map();
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
export async function createProject(userId, board, sharing = {}) {
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
    sharing: sharingSettings(sharing),
  });
  return id;
}
export async function loadProject(userId, id) {
  const snap = await getDoc(projectRef(userId, id));
  if (!snap.exists())
    throw Error("This project does not exist or has been deleted.");
  const entries = await getDocs(collection(projectRef(userId,id),'entries'));
  loadedEntries.set(`${userId}/${id}`,new Set(entries.docs.map(d=>d.id)));
  return { id: snap.id, ...snap.data(), boardJson: JSON.stringify(mergeEntries(JSON.parse(snap.data().boardJson), entries.docs.map(d=>({id:d.id,...d.data()})))) };
}
export async function addLiveTableRow(userId,id,blockId,values,columnIds) {
  if(auth.currentUser?.uid!==userId)throw Error('Sign in as the project owner to add rows.');
  const sessionId=uid();await acquireEditor(userId,id,sessionId);
  try{return await runTransaction(db,async transaction=>{
    const target=projectRef(userId,id),snapshot=await transaction.get(target);
    if(!snapshot.exists())throw Error('This project is unavailable for your account.');
    const board=appendLiveRow(JSON.parse(snapshot.data().boardJson),blockId,values,columnIds);
    board.blocks=board.blocks.map(b=>b.type==='table'&&b.id===blockId?withAudit(b,auth.currentUser):b);
    if(boardBytes(board)>800000)throw Error('This board is too large to save another row.');
    transaction.update(target,{boardJson:JSON.stringify(board),updatedAt:serverTimestamp(),editorSessionId});
    return board;
  });}finally{await releaseEditor(userId,id,sessionId);}
}
export async function saveProject(userId, id, board, sessionId) {
  if (boardBytes(board) > 800000)
    throw Error(
      "This board is larger than 800 KB. Split large tables into another project before saving.",
    );
  const batch=writeBatch(db), clean=baseBoard(board);
  const existing=await getDocs(collection(projectRef(userId,id),'entries'));
  const existingById=new Map(existing.docs.map(d=>[d.id,d.data()]));
  for(const b of board.blocks.filter(b=>b.type==='table')) {
    b.table.rowMeta?.forEach((meta,i)=>{const old=existingById.get(meta?.id);if(meta?.entry&&meta.tableId===b.id&&old&&(JSON.stringify(old.values)!==JSON.stringify(b.table.rows[i])||JSON.stringify(old.columnIds)!==JSON.stringify(b.table.columns.map(c=>c.id)))) batch.update(doc(projectRef(userId,id),'entries',meta.id),{values:b.table.rows[i],columnIds:b.table.columns.map(c=>c.id)});});
  }
  const retained=new Set(board.blocks.filter(b=>b.type==='table').flatMap(b=>(b.table.rowMeta||[]).filter(m=>m?.entry&&m.tableId===b.id).map(m=>m.id)));
  // Only delete submissions present in this editor's loaded snapshot. Newly arriving
  // submissions are retained, even while the layout editor is open.
  const known=loadedEntries.get(`${userId}/${id}`)||new Set();
  for(const d of existing.docs) if(known.has(d.id)&&!retained.has(d.id))batch.delete(d.ref);
  batch.set(projectRef(userId,id), {
      name: board.name,
      boardJson: JSON.stringify(clean),
      blockCount: board.blocks.length,
      updatedAt: serverTimestamp(),
      editorSessionId: sessionId || '',
    },{merge:true});
  await batch.commit();
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
  const currentEntries=await getDocs(collection(projectRef(userId,projectId),'entries'));
  board=mergeEntries(baseBoard(board),currentEntries.docs.map(d=>({id:d.id,...d.data()})));
  board.blocks=board.blocks.map(b=>b.type==='table'?withAudit(b,auth.currentUser):b);
  const id = existingId || uid(),
    snapshot = publishSnapshot(board);
  if (boardBytes(snapshot) > 800000)
    throw Error("This board is too large to publish. Reduce its table data.");
  const project=await getDoc(projectRef(userId,projectId)), sharing=sharingSettings(project.data().sharing);
  if(snapshot.blocks.some(b=>b.type==='table'&&b.table.personal?.enabled)&&sharing.audience==='public')throw Error('Personal dashboards require “Specific emails” or “All MaiBoard users”. Change the audience in Sharing.');
  const generation=uid(), rows=[], identities=[];
  for(const block of snapshot.blocks.filter(b=>b.type==='table')) {
    const audited=withAudit(block,auth.currentUser);block.table=audited.table;
    block.table.rows.forEach((values,index)=>{if(!block.table.rowMeta?.[index]?.entry)rows.push({tableId:block.id,values,order:index,visibleTo:rowAudience(block.table,values)});});
    for(const m of block.table.personal?.mapping||[])identities.push({tableId:block.id,email:emailKey(m.email),value:String(m.value)});
    block.table.rows=[]; delete block.table.rowMeta;
    if(block.table.personal)delete block.table.personal.mapping;
  }
  // Write a new immutable generation first, then atomically switch its pointer.
  // A failed upload leaves the old published generation intact.
  for(let offset=0;offset<rows.length;offset+=400){const chunk=writeBatch(db);for(const row of rows.slice(offset,offset+400))chunk.set(doc(db,'publications',id,'generations',generation,'rows',uid()),{...row,publicationId:id,generation,ownerUid:userId,projectId});await chunk.commit();}
  for(let offset=0;offset<identities.length;offset+=400){const chunk=writeBatch(db);for(const identity of identities.slice(offset,offset+400))chunk.set(doc(projectRef(userId,projectId),'identities',`${identity.tableId}_${encodeURIComponent(identity.email)}`),identity);await chunk.commit();}
  const entryUpdates=[];
  for(const block of board.blocks.filter(b=>b.type==='table'))block.table.rowMeta?.forEach((meta,index)=>{if(meta?.entry&&meta.tableId===block.id)entryUpdates.push({id:meta.id,visibleTo:rowAudience(block.table,block.table.rows[index])});});
  for(let offset=0;offset<entryUpdates.length;offset+=400){const chunk=writeBatch(db);for(const entry of entryUpdates.slice(offset,offset+400))chunk.update(doc(projectRef(userId,projectId),'entries',entry.id),{generation,visibleTo:entry.visibleTo});await chunk.commit();}
  const batch = writeBatch(db);
  for(const block of board.blocks.filter(b=>b.type==='table'))batch.set(doc(projectRef(userId,projectId),'policies',block.id),tablePolicy(block));
  batch.set(doc(db, "publications", id), {
    ownerUid: userId,
    projectId,
    name: board.name,
    boardJson: JSON.stringify(snapshot),
    publishedAt: serverTimestamp(),
    sharing, generation, schemaVersion: 2,
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
  const data=s.data();
  if(data.schemaVersion!==2)return data;
  const rows=await getDocs(query(collection(db,'publications',id,'generations',data.generation,'rows'),where('visibleTo','in',auth.currentUser?.email?['*',emailKey(auth.currentUser.email)]:['*'])));
  const board=JSON.parse(data.boardJson);
  for(const b of board.blocks.filter(b=>b.type==='table'))b.table.rows=rows.docs.map(d=>d.data()).filter(r=>r.tableId===b.id).sort((a,b)=>a.order-b.order).map(r=>r.values);
  const entries=await getDocs(query(collection(projectRef(data.ownerUid,data.projectId),'entries'),where('generation','==',data.generation),where('visibleTo','in',auth.currentUser?.email?['*',emailKey(auth.currentUser.email)]:['*'])));
  data.boardJson=JSON.stringify(mergeEntries(board,entries.docs.map(d=>({id:d.id,...d.data()}))));
  return data;
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

export function tablePolicy(block) {
  const table=block.table;
  const personal=table.personal||{enabled:false};
  return {tableId:block.id,columns:table.columns,columnIds:table.columns.map(c=>c.id),teamAdd:table.teamAdd===true,teamDeleteOwn:table.teamDeleteOwn===true,personal,audit:table.audit===true,identityIndex:table.columns.findIndex(c=>c.id===personal.columnId),identities:Object.fromEntries((personal.mapping||[]).map(m=>[emailKey(m.email),String(m.value)]))};
}
export function watchShared(email,next,error){
  return onSnapshot(query(collection(db,'projectInvites'),where('email','==',emailKey(email))),s=>next(s.docs.map(d=>({id:d.id,...d.data()}))),error);
}
export function watchSaved(uid,next,error){return onSnapshot(collection(db,'users',uid,'saved'),s=>next(s.docs.map(d=>({id:d.id,...d.data()}))),error);}
export async function bookmarkPublication(id,name){
  if(!auth.currentUser||auth.currentUser.isAnonymous)throw Error('Sign in to save a published project.');
  await setDoc(doc(db,'users',auth.currentUser.uid,'saved',id),{name,publicationId:id,savedAt:serverTimestamp()});
}
export async function removeBookmark(id){await deleteDoc(doc(db,'users',auth.currentUser.uid,'saved',id));}
export async function updateSharing(ownerUid,id,value){
  const sharing=sharingSettings(value),target=projectRef(ownerUid,id),snapshot=await getDoc(target);
  const old=sharingSettings(snapshot.data().sharing),batch=writeBatch(db);
  const inviteRef=email=>doc(db,'projectInvites',`${ownerUid}_${id}_${encodeURIComponent(email)}`);
  for(const email of old.editorEmails.filter(e=>!sharing.editorEmails.includes(e)))batch.delete(inviteRef(email));
  for(const email of sharing.editorEmails)batch.set(inviteRef(email),{ownerUid,projectId:id,email,name:snapshot.data().name,role:'editor'});
  batch.update(target,{sharing});
  // Audience changes apply to the current link immediately.
  if(snapshot.data().publicationId)batch.update(doc(db,'publications',snapshot.data().publicationId),{sharing});
  await batch.commit();return sharing;
}
const leaseRef=(owner,id)=>doc(projectRef(owner,id),'sessions','editor');
export async function acquireEditor(owner,id,sessionId){
  return runTransaction(db,async tx=>{
    const ref=leaseRef(owner,id),snap=await tx.get(ref),old=snap.data();
    if(old&&old.expiresAt.toMillis()>Date.now()&&old.sessionId!==sessionId)throw Error(`${old.name||'Another editor'} is editing this project. Try again when they finish.`);
    const lease={uid:auth.currentUser.uid,sessionId,name:auth.currentUser.displayName||'An editor',expiresAt:Timestamp.fromMillis(Date.now()+90000)};
    tx.set(ref,lease);return lease;
  });
}
export async function renewEditor(owner,id,sessionId){
  await runTransaction(db,async tx=>{const ref=leaseRef(owner,id),snap=await tx.get(ref);if(snap.data()?.sessionId!==sessionId)throw Error('Your editing session has ended.');tx.update(ref,{expiresAt:Timestamp.fromMillis(Date.now()+90000)});});
}
export async function releaseEditor(owner,id,sessionId){
  await runTransaction(db,async tx=>{const ref=leaseRef(owner,id),snap=await tx.get(ref);if(snap.data()?.sessionId===sessionId)tx.delete(ref);});
}
export function watchEditor(owner,id,next,error){return onSnapshot(leaseRef(owner,id),{includeMetadataChanges:true},s=>{if(!s.metadata.fromCache&&!s.metadata.hasPendingWrites)next(s.data());},error);}
export async function addTeamRow(publicationId,block,values){
  const user=auth.currentUser;if(!user?.email||user.isAnonymous)throw Error('Sign in before adding team data.');
  const publication=await getDoc(doc(db,'publications',publicationId)),p=publication.data();
  const policy=block.table;if(!policy?.teamAdd)throw Error('Adding rows is disabled for this table.');
  const columns=policy.columns,clean=columns.map((c,i)=>c.id===AUDIT_BY?(user.displayName||'Team member'):c.id===AUDIT_ON?new Date().toISOString().slice(0,10):String(values[i]??''));
  if(columns.some((c,i)=>c.type==='select'&&clean[i]&&!(c.options||[]).includes(clean[i])))throw Error('Choose one of the allowed column values.');
  if(policy.personal?.enabled){const index=columns.findIndex(c=>c.id===policy.personal.columnId);const identity=policy.personal.mode==='mapping'?(await getDoc(doc(projectRef(p.ownerUid,p.projectId),'identities',`${block.id}_${encodeURIComponent(emailKey(user.email))}`))).data()?.value:user.email;if(!identity)throw Error('Ask the owner to add your email-to-name mapping.');clean[index]=identity;}
  const id=uid();await setDoc(doc(projectRef(p.ownerUid,p.projectId),'entries',id),{
    tableId:block.id,columnIds:columns.map(c=>c.id),values:clean,visibleTo:policy.personal?.enabled?emailKey(user.email):'*',
    createdByUid:user.uid,createdByName:user.displayName||'Team member',createdOn:new Date().toISOString(),createdAt:serverTimestamp(),publicationId,generation:p.generation,
  });
}
export async function deleteTeamRow(publicationId,entryId){
  const publication=await getDoc(doc(db,'publications',publicationId)),p=publication.data();
  await deleteDoc(doc(projectRef(p.ownerUid,p.projectId),'entries',entryId));
}

export async function getProjectSharing(owner,id){const snap=await getDoc(projectRef(owner,id));return sharingSettings(snap.data()?.sharing);}
