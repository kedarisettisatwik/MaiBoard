import {validateEntity,entityTable,stripEntityData,recipientBoard,sectionEmails} from './entities';
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
  const batch=writeBatch(db);batch.set(projectRef(userId, id), {
    name: board.name,
    boardJson: JSON.stringify(stripEntityData(board)),
    blockCount: board.blocks.length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publicationId: null,
    sharing: sharingSettings(sharing),
  });
  const audience=sharingSettings(sharing);for(const email of new Set([...audience.viewerEmails,...audience.editorEmails]))batch.set(doc(db,'projectInvites',`${userId}_${id}_${encodeURIComponent(email)}`),{ownerUid:userId,projectId:id,email,name:board.name,role:audience.editorEmails.includes(email)?'editor':'viewer',publicationId:null});await batch.commit();
  return id;
}
export async function loadProject(userId, id) {
  const snap = await getDoc(projectRef(userId, id));
  if (!snap.exists())
    throw Error("This project does not exist or has been deleted.");
  const entries = await getDocs(collection(projectRef(userId,id),'entries'));
  loadedEntries.set(`${userId}/${id}`,new Set(entries.docs.map(d=>d.id)));
  const hydrated=await hydrateEntities(JSON.parse(snap.data().boardJson));
  const entryIds=new Set(entries.docs.map(d=>d.id));for(const b of hydrated.blocks.filter(b=>b.table?.entityKey)){const keep=b.table.rows.map((_,i)=>!b.table.rowMeta?.[i]?.entry||b.table.rowMeta[i].tableId!==b.id||entryIds.has(b.table.rowMeta[i].id));b.table.rows=b.table.rows.filter((_,i)=>keep[i]);b.table.rowMeta=(b.table.rowMeta||[]).filter((_,i)=>keep[i]);}
  return { id: snap.id, ...snap.data(), boardJson: JSON.stringify(mergeEntries(hydrated, entries.docs.map(d=>({id:d.id,...d.data()})))) };
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
  const clean=stripEntityData(baseBoard(board));
  const existing=await getDocs(collection(projectRef(userId,id),'entries'));
  const existingById=new Map(existing.docs.map(d=>[d.id,d.data()]));
  const changedEntities=new Map();
  await runTransaction(db,async batch=>{
    const projectSnapshot=await batch.get(projectRef(userId,id));
    const sharing=sharingSettings(projectSnapshot.data().sharing);
    const linked=new Map();for(const b of board.blocks.filter(b=>b.table?.entityKey)){const data=validateEntity(b.table),key=b.table.entityKey;if(linked.has(key)&&JSON.stringify(linked.get(key).data)!==JSON.stringify(data))throw Error('Linked copies of an entity disagree. Reload and retry.');linked.set(key,{data,table:b.table});}
    const entitySnapshots=[];for(const [key,value] of linked)entitySnapshots.push([key,value,await batch.get(entityRef(key))]);
    for(const [key,value,snap] of entitySnapshots){if(!snap.exists())throw Error('The linked entity no longer exists.');const data=snap.data(),json=JSON.stringify(value.data),expected=entityVersions.get(key)??value.table.entityRevision;if(data.revision!==expected)throw Error('This entity changed in another tab or project. Reload before saving.');const patch={dataJson:json,revision:data.revision+1,updatedAt:serverTimestamp()};if(data.ownerUid===auth.currentUser.uid)patch.editorEmails=[...new Set([...data.editorEmails,...sharing.editorEmails])];batch.update(entityRef(key),patch);changedEntities.set(key,patch.revision);}
  for(const b of board.blocks.filter(b=>b.type==='table')) {
    b.table.rowMeta?.forEach((meta,i)=>{const old=existingById.get(meta?.id);if(meta?.entry&&meta.tableId===b.id&&old&&(JSON.stringify(old.values)!==JSON.stringify(b.table.rows[i])||JSON.stringify(old.columnIds)!==JSON.stringify(b.table.columns.map(c=>c.id)))) batch.update(doc(projectRef(userId,id),'entries',meta.id),{values:b.table.rows[i],columnIds:b.table.columns.map(c=>c.id),booleanValues:{}});});
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
  });
  for(const [key,revision] of changedEntities)entityVersions.set(key,revision);
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
  const id = existingId || uid();
  let snapshot = publishSnapshot(board);
  if (boardBytes(snapshot) > 800000)
    throw Error("This board is too large to publish. Reduce its table data.");
  const project=await getDoc(projectRef(userId,projectId)), sharing=sharingSettings(project.data().sharing);
  if(snapshot.blocks.some(b=>b.type==='table'&&b.table.personal?.enabled)&&sharing.audience==='public')throw Error('Personal dashboards require “Specific emails” or “All MaiBoard users”. Create a project with a signed-in audience.');
  const generation=uid(), rows=[], identities=[],fullSnapshot=structuredClone(snapshot),recipientMode=sharing.audience==='emails';
  if(recipientMode)snapshot=recipientBoard(snapshot,'',sharing);
  for(const block of snapshot.blocks.filter(b=>b.type==='table')) {
    const audited=withAudit(block,auth.currentUser);block.table=audited.table;
    block.table.rows.forEach((values,index)=>{if(!recipientMode&&!block.table.rowMeta?.[index]?.entry)rows.push({tableId:block.id,values,order:index,visibleTo:rowAudience(block.table,values)});});
    for(const m of block.table.personal?.mapping||[])identities.push({tableId:block.id,email:emailKey(m.email),value:String(m.value)});
    block.table.rows=[]; delete block.table.rowMeta;
    if(block.table.personal)delete block.table.personal.mapping;
  }
  if(recipientMode){const emails=[...new Set([...sharing.viewerEmails,...sharing.editorEmails,emailKey(auth.currentUser.email)])];for(const email of emails){const variant=email===emailKey(auth.currentUser.email)&&auth.currentUser.uid===userId?structuredClone(fullSnapshot):recipientBoard(fullSnapshot,email,sharing);for(const b of variant.blocks.filter(b=>b.type==='table')){const keep=b.table.rows.map((r,i)=>!b.table.rowMeta?.[i]?.entry&&(!b.table.personal?.enabled||rowAudience(b.table,r)===email));b.table.rows=b.table.rows.filter((_,i)=>keep[i]);delete b.table.rowMeta;if(b.table.personal)delete b.table.personal.mapping;}const boardJson=JSON.stringify(variant);if(new TextEncoder().encode(boardJson).length>800000)throw Error('A recipient view exceeds 800 KB.');await setDoc(doc(db,'publications',id,'generations',generation,'recipients',encodeURIComponent(email)),{ownerUid:userId,projectId,email,generation,boardJson});}}
  // Write a new immutable generation first, then atomically switch its pointer.
  // A failed upload leaves the old published generation intact.
  for(let offset=0;offset<rows.length;offset+=400){const chunk=writeBatch(db);for(const row of rows.slice(offset,offset+400))chunk.set(doc(db,'publications',id,'generations',generation,'rows',uid()),{...row,publicationId:id,generation,ownerUid:userId,projectId});await chunk.commit();}
  for(let offset=0;offset<identities.length;offset+=400){const chunk=writeBatch(db);for(const identity of identities.slice(offset,offset+400))chunk.set(doc(projectRef(userId,projectId),'identities',`${identity.tableId}_${encodeURIComponent(identity.email)}`),identity);await chunk.commit();}
  const entryUpdates=[];
  for(const block of board.blocks.filter(b=>b.type==='table'))block.table.rowMeta?.forEach((meta,index)=>{if(meta?.entry&&meta.tableId===block.id)entryUpdates.push({id:meta.id,visibleTo:rowAudience(block.table,block.table.rows[index])});});
  for(let offset=0;offset<entryUpdates.length;offset+=400){const chunk=writeBatch(db);for(const entry of entryUpdates.slice(offset,offset+400))chunk.update(doc(projectRef(userId,projectId),'entries',entry.id),{generation,visibleTo:entry.visibleTo});await chunk.commit();}
  const batch = writeBatch(db);
  for(const block of board.blocks.filter(b=>b.type==='table'))batch.set(doc(projectRef(userId,projectId),'policies',block.id),{...tablePolicy(block),grantEmails:sectionEmails(board,block,sharing)||'*'});
  batch.set(doc(db, "publications", id), {
    ownerUid: userId,
    projectId,
    name: board.name,
    boardJson: JSON.stringify(snapshot),
    publishedAt: serverTimestamp(),
    sharing, generation, schemaVersion: 2, recipientMode,
  });
  for(const email of new Set([...sharing.viewerEmails,...sharing.editorEmails]))batch.set(doc(db,'projectInvites',`${userId}_${projectId}_${encodeURIComponent(email)}`),{ownerUid:userId,projectId,email,name:board.name,role:sharing.editorEmails.includes(email)?'editor':'viewer',publicationId:id});
  batch.update(projectRef(userId, projectId), { publicationId: id });
  await batch.commit();
  return id;
}
export async function unpublishProject(userId, projectId, id) {
  const project=await getDoc(projectRef(userId,projectId)),sharing=sharingSettings(project.data().sharing);
  const batch = writeBatch(db);
  for(const email of new Set([...sharing.viewerEmails,...sharing.editorEmails]))batch.update(doc(db,'projectInvites',`${userId}_${projectId}_${encodeURIComponent(email)}`),{publicationId:null});
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
  let board;
  if(data.recipientMode){const email=emailKey(auth.currentUser?.email);if(!email)throw Error('Sign in to open this project.');const variant=await getDoc(doc(db,'publications',id,'generations',data.generation,'recipients',encodeURIComponent(email)));if(!variant.exists()||variant.data().generation!==data.generation)throw Error('Ask the owner to republish this project to prepare your view.');board=JSON.parse(variant.data().boardJson);}else{
    const rows=await getDocs(query(collection(db,'publications',id,'generations',data.generation,'rows'),where('visibleTo','in',auth.currentUser?.email?['*',emailKey(auth.currentUser.email)]:['*'])));
    board=JSON.parse(data.boardJson);
    for(const b of board.blocks.filter(b=>b.type==='table'))b.table.rows=rows.docs.map(d=>d.data()).filter(r=>r.tableId===b.id).sort((a,b)=>a.order-b.order).map(r=>r.values);
  }
  const entryQueries=data.recipientMode?board.blocks.filter(b=>b.type==='table').map(b=>query(collection(projectRef(data.ownerUid,data.projectId),'entries'),where('generation','==',data.generation),where('tableId','==',b.id),where('visibleTo','in',auth.currentUser?.email?['*',emailKey(auth.currentUser.email)]:['*']))):[query(collection(projectRef(data.ownerUid,data.projectId),'entries'),where('generation','==',data.generation),where('visibleTo','in',auth.currentUser?.email?['*',emailKey(auth.currentUser.email)]:['*']))];
  const entries=(await Promise.all(entryQueries.map(q=>getDocs(q)))).flatMap(s=>s.docs.map(d=>({id:d.id,...d.data()})));
  data.boardJson=JSON.stringify(mergeEntries(board,entries));
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
  const sharing=sharingSettings(project.sharing);for(const email of new Set([...sharing.viewerEmails,...sharing.editorEmails]))batch.delete(doc(db,'projectInvites',`${userId}_${project.id}_${encodeURIComponent(email)}`));
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
  return {tableId:block.id,booleanColumnIds:table.columns.filter(c=>c.type==='boolean').map(c=>c.id),columns:table.columns,columnIds:table.columns.map(c=>c.id),teamAdd:table.teamAdd===true,teamDeleteOwn:table.teamDeleteOwn===true,personal,audit:table.audit===true,identityIndex:table.columns.findIndex(c=>c.id===personal.columnId),identities:Object.fromEntries((personal.mapping||[]).map(m=>[emailKey(m.email),String(m.value)]))};
}
export function watchShared(email,next,error){
  let active=true,revision=0;const stop=onSnapshot(query(collection(db,'projectInvites'),where('email','==',emailKey(email))),async s=>{const at=++revision;try{const invitations=await Promise.all(s.docs.map(async d=>{const data={id:d.id,...d.data()};if(data.publicationId===undefined&&data.role==='editor'){try{const p=await getDoc(projectRef(data.ownerUid,data.projectId));data.publicationId=p.data()?.publicationId||null;}catch{}}return data;}));if(active&&at===revision)next(invitations);}catch(e){if(active)error?.(e);}},error);return()=>{active=false;stop();};
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
  if(sharing.audience!==old.audience)throw Error('Project type cannot be changed after creation.');
  const inviteRef=email=>doc(db,'projectInvites',`${ownerUid}_${id}_${encodeURIComponent(email)}`);
  const recipients=[...new Set([...sharing.viewerEmails,...sharing.editorEmails])];for(const email of new Set([...old.viewerEmails,...old.editorEmails]))if(!recipients.includes(email))batch.delete(inviteRef(email));
  for(const email of recipients)batch.set(inviteRef(email),{ownerUid,projectId:id,email,name:snapshot.data().name,role:sharing.editorEmails.includes(email)?'editor':'viewer',publicationId:snapshot.data().publicationId||null});
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

const entityVersions=new Map();
const entityRef=key=>doc(db,'tableEntities',key);
export function watchEntities(user,next,error){const owned=new Map(),shared=new Map(),emit=()=>next([...new Map([...owned,...shared]).values()].sort((a,b)=>a.name.localeCompare(b.name)));const accept=(target,s)=>{target.clear();for(const d of s.docs)target.set(d.id,{id:d.id,...d.data()});emit();};const stops=[onSnapshot(query(collection(db,'tableEntities'),where('ownerUid','==',user.uid)),s=>accept(owned,s),error)];if(user.email)stops.push(onSnapshot(query(collection(db,'tableEntities'),where('editorEmails','array-contains',emailKey(user.email))),s=>accept(shared,s),error));return()=>stops.forEach(stop=>stop());}
export async function getEntity(key){if(!/^[a-zA-Z0-9_-]{8,100}$/.test(key))throw Error('Enter a valid entity key.');const snap=await getDoc(entityRef(key));if(!snap.exists())throw Error('No table entity exists with this key.');entityVersions.set(key,snap.data().revision);return {id:snap.id,...snap.data()};}
export async function saveEntity(key,name,table,editorEmails=[]){const dataJson=JSON.stringify(validateEntity(table));if(new TextEncoder().encode(dataJson).length>750000)throw Error('This entity is too large (750 KB limit).');const clean=sharingSettings({editorEmails}).editorEmails;if(!key){key=uid();await setDoc(entityRef(key),{name:name.trim().slice(0,100)||'Untitled table',ownerUid:auth.currentUser.uid,editorEmails:clean,dataJson,revision:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});entityVersions.set(key,1);}else{await runTransaction(db,async tx=>{const snap=await tx.get(entityRef(key));if(snap.data().revision!==entityVersions.get(key))throw Error('This entity changed elsewhere. Reopen it before saving.');const revision=snap.data().revision+1,patch={name:name.trim().slice(0,100)||'Untitled table',dataJson,revision,updatedAt:serverTimestamp()};if(snap.data().ownerUid===auth.currentUser.uid)patch.editorEmails=clean;tx.update(entityRef(key),patch);});entityVersions.set(key,entityVersions.get(key)+1);}return key;}
export async function hydrateEntities(board){const copy=structuredClone(board),keys=[...new Set(copy.blocks.filter(b=>b.table?.entityKey).map(b=>b.table.entityKey))],entities=new Map(await Promise.all(keys.map(async key=>[key,await getEntity(key)])));for(const block of copy.blocks.filter(b=>b.table?.entityKey))block.table=entityTable(block.table,entities.get(block.table.entityKey));return copy;}

export async function toggleTeamBoolean(publicationId,block,index,columnId,checked){const meta=block.table.rowMeta?.[index],column=block.table.columns.find(c=>c.id===columnId);if(!meta?.entry||meta.uid!==auth.currentUser?.uid||column?.type!=='boolean')throw Error('You can toggle checkboxes only on records you added.');const publication=await getDoc(doc(db,'publications',publicationId)),p=publication.data();await runTransaction(db,async tx=>{const target=doc(projectRef(p.ownerUid,p.projectId),'entries',meta.id),snap=await tx.get(target);if(snap.data()?.createdByUid!==auth.currentUser.uid)throw Error('This record belongs to another person.');tx.update(target,{booleanValues:{...snap.data().booleanValues,[columnId]:String(checked)}});});}

export async function loadSavedAdditions(publicationId){const snap=await getDoc(doc(db,'users',auth.currentUser.uid,'saved',publicationId,'workspace','additions'));return snap.exists()?JSON.parse(snap.data().boardJson):{};}
export async function saveSavedAdditions(publicationId,additions){const boardJson=JSON.stringify(additions);if(new TextEncoder().encode(boardJson).length>800000)throw Error('Your additions exceed 800 KB.');await setDoc(doc(db,'users',auth.currentUser.uid,'saved',publicationId,'workspace','additions'),{boardJson,updatedAt:serverTimestamp()});}
