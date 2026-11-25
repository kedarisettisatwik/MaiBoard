import {recordInteraction,applyViewerProgress,applyLiveInteraction,readCachedProgress,cacheProgress} from './viewerProgress';
import {combineSavedBoard,savedAdditions} from './savedWorkspace';
import {useUnsavedChanges,useProjectCamera} from './WorkspaceControls';
import {cameraForView,readProjectZoom} from './camera';
import {updateLiveTable} from './liveData';
import {appendLiveRow} from './model';
import React, { useEffect, useRef, useState } from "react";
import { loadViewerProgress,saveViewerProgress,loadSavedAdditions,saveSavedAdditions,toggleTeamBoolean, getPublication, loadProject, saveProject, bookmarkPublication, addTeamRow, deleteTeamRow } from "./firebase";
import { readableError, viewBlocks, projectViews, startingView, upgradeBoard } from "./model";
import { Logo, Icon, IconButton, Spinner, ErrorMessage, Modal, Field } from "./ui";
import {CellInput} from "./TableControls";
import { PresentationTabs } from "./Views";
import BoardStage, { blockHeight } from "./BoardStage";
export default function Viewer({ id, live=false, personal=false, user, onSignIn, ownerUid=user?.uid, sessionId }) {
  const [board, setBoard] = useState(null),
    [publication,setPublication]=useState(null),[progressStatus,setProgressStatus]=useState('saved'),[checkboxPending,setCheckboxPending]=useState(new Set()),
    [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[leaveAction,setLeaveAction]=useState(null),[bookmarked,setBookmarked]=useState(false),
    [error, setError] = useState(""),
    [publishedAt, setPublishedAt] = useState(null),
    [retry, setRetry] = useState(0),
    [activeView, setActiveView] = useState(null),
    [runtimeTabs, setRuntimeTabs] = useState({}),
    [rowTarget,setRowTarget]=useState(null),[rowValues,setRowValues]=useState([]),[rowError,setRowError]=useState(''),[savingRow,setSavingRow]=useState(false),
    stageRef = useRef(), boardRef=useRef(null),personalSource=useRef(null),progressBase=useRef(null),progressRef=useRef({version:1,blocks:{}}),progressQueue=useRef(Promise.resolve()),progressRevision=useRef(0),revision=useRef(0);
  const cameraKey=personal?`saved/${user?.uid}/${id}`:live?`${ownerUid}/${id}`:publication?(publication.ownerUid&&publication.projectId?`${publication.ownerUid}/${publication.projectId}`:`publication/${id}`):null;
  const [view,setView,cameraRef]=useProjectCamera(cameraKey,{x:0,y:0,z:1}),framedCameraKey=useRef(null);
  const progressScope=useRef(null);progressScope.current=`${id}/${user?.uid||'guest'}/${live}/${personal}`;
  boardRef.current=board;
  useUnsavedChanges(live&&dirty,action=>setLeaveAction(()=>action));
  useEffect(() => {
    let active = true;
    setError("");setBoard(null);
    const load=async()=>{
      let p;
      if(personal){const [publication,overlay]=await Promise.all([getPublication(id),loadSavedAdditions(id)]);personalSource.current=upgradeBoard(JSON.parse(publication.boardJson));p={...publication,boardJson:JSON.stringify(combineSavedBoard(personalSource.current,overlay))};}
      else p=live?await loadProject(ownerUid,id):await getPublication(id);
      const loaded=upgradeBoard(JSON.parse(p.boardJson));let state={version:1,blocks:{}};
      if(!live||personal){const uid=user&&!user.isAnonymous?user.uid:null,cached=readCachedProgress(id,uid);if(uid){const cloud=await loadViewerProgress(id,uid);state=cached?.pending?cached.state:cloud;}else state=cached?.state||state;}
      if(!active)return;
      progressBase.current=loaded;progressRef.current=state;progressRevision.current=0;
      const rendered=applyViewerProgress(loaded,state,b=>!live||(personal&&b.sourceBlock));
      setPublication(p);boardRef.current=rendered;setBoard(rendered);setDirty(false);revision.current=0;setProgressStatus('saved');setPublishedAt(p.publishedAt?.toDate?.());
      const uid=user&&!user.isAnonymous?user.uid:null,cached=readCachedProgress(id,uid);if((!live||personal)&&uid&&cached?.pending){setProgressStatus('saving');const task=progressQueue.current.catch(()=>{}).then(()=>saveViewerProgress(id,state,uid));progressQueue.current=task;task.then(()=>{if(active&&progressRevision.current===0){cacheProgress(id,uid,state,false);setProgressStatus('saved');}}).catch(e=>{if(active){setProgressStatus('error');setRowError('Could not sync progress to your account. '+readableError(e));}});}
    };
    load()
      .catch((e) => {
        if (active) setError(e.code==='permission-denied'?'Sign in with an email address that has access. This project may be restricted or no longer shared with you.':readableError(e));
      });
    return () => (active = false);
  }, [id, retry, live, personal, user?.uid,ownerUid]);
  const openRow=(blockId)=>{const block=board.blocks.find(b=>b.id===blockId&&b.type==='table');if(!block||(personal&&block.sourceBlock)||(!live&&!(publication?.sharing?.audience==='emails'&&block.table.teamAdd&&user?.email)))return;setRowTarget(structuredClone(block));setRowValues(block.table.columns.map(()=>''));setRowError('');};
  const saveRow=async(e)=>{e.preventDefault();setSavingRow(true);setRowError('');try{if(live){const current=boardRef.current, appended=appendLiveRow(current,rowTarget.id,rowValues,rowTarget.table.columns.map(c=>c.id)), target=appended.blocks.find(b=>b.id===rowTarget.id);changeTable(rowTarget.id,target.table);}else{await addTeamRow(id,rowTarget,rowValues);setRetry(x=>x+1);}setRowTarget(null);}catch(e){setRowError(readableError(e));}finally{setSavingRow(false);}};
  useEffect(()=>{if(live||!board||!user||user.isAnonymous||sessionStorage.getItem('maiboard-save-publication')!==id)return;sessionStorage.removeItem('maiboard-save-publication');bookmarkPublication(id,board.name).then(()=>setBookmarked(true)).catch(e=>setRowError(e.message));},[id,board,user?.uid,live]);
  const changeTable=(blockId,table)=>{try{const next=updateLiveTable(boardRef.current,blockId,table,user);if(personal)progressBase.current={...progressBase.current,blocks:progressBase.current.blocks.map(b=>b.id===blockId?next.blocks.find(x=>x.id===blockId):b)};boardRef.current=next;setBoard(next);revision.current++;setDirty(true);setRowError('');}catch(e){setRowError(e.message);}};
  const interact=(blockId,action)=>{try{
    const block=boardRef.current.blocks.find(b=>b.id===blockId),privateProgress=!live||(personal&&block?.sourceBlock);
    if(!privateProgress){const next=applyLiveInteraction(boardRef.current,blockId,action);boardRef.current=next;if(personal)progressBase.current={...progressBase.current,blocks:progressBase.current.blocks.map(b=>b.id===blockId?next.blocks.find(x=>x.id===blockId):b)};setBoard(next);revision.current++;setDirty(true);return;}
    const state=recordInteraction(progressBase.current,progressRef.current,blockId,action),uid=user&&!user.isAnonymous?user.uid:null,at=++progressRevision.current,scope=progressScope.current;
    progressRef.current=state;const next=applyViewerProgress(progressBase.current,state,b=>!live||(personal&&b.sourceBlock));boardRef.current=next;setBoard(next);setRowError('');
    const cached=cacheProgress(id,uid,state,!!uid);if(!cached&&!uid)throw Error('Your browser could not store this progress. Allow local storage to keep it after closing.');
    if(!uid){setProgressStatus('saved');return;}
    setProgressStatus('saving');const task=progressQueue.current.catch(()=>{}).then(()=>saveViewerProgress(id,state,uid));progressQueue.current=task;
    task.then(()=>{if(scope===progressScope.current&&at===progressRevision.current){cacheProgress(id,uid,state,false);setProgressStatus('saved');}}).catch(e=>{if(scope===progressScope.current&&at===progressRevision.current){setProgressStatus('error');setRowError((cached?'Progress is kept in this browser but could not sync to your account. ':'Progress could not sync to your account. ')+readableError(e));}});
  }catch(e){setRowError(readableError(e));setProgressStatus('error');}};
  const save=async()=>{if(!live||!dirty||saving)return false;const snapshot=structuredClone(boardRef.current),at=revision.current;setSaving(true);setRowError('');try{await (personal?saveSavedAdditions(id,savedAdditions(personalSource.current,snapshot)):saveProject(ownerUid,id,snapshot,sessionId));if(at===revision.current)setDirty(false);return at===revision.current;}catch(e){setRowError(readableError(e));return false;}finally{setSaving(false);}};
  const currentView = activeView || (board ? startingView(board) : "view-1");
  const fit = (preserve=false) => {
    const rect=stageRef.current?.getBoundingClientRect();if(!boardRef.current||!rect)return;
    const zoom=preserve===true?(framedCameraKey.current===cameraKey?cameraRef.current.z:readProjectZoom(cameraKey)):null;
    setView(cameraForView(viewBlocks(boardRef.current,currentView).filter(b=>!b.tabParentId),rect,zoom,1.25));framedCameraKey.current=cameraKey;
  };
  useEffect(()=>{if(!board)return;const frame=requestAnimationFrame(()=>fit(true));return()=>cancelAnimationFrame(frame);},[!!board,currentView,cameraKey]);
  const zoom = (delta) =>
    setView((v) => {
      const r = stageRef.current.getBoundingClientRect(),
        z = Math.max(0.15, Math.min(2, v.z + delta));
      return {
        x: r.width / 2 - ((r.width / 2 - v.x) * z) / v.z,
        y: r.height / 2 - ((r.height / 2 - v.y) * z) / v.z,
        z,
      };
    });
  return (
    <div className="viewer">
      <nav className="app-nav">
        <Logo onClick={() => (location.hash = "/")} />
        <span className="nav-divider" />
        <strong>{board?.name || "Presentation"}</strong>
        {(!live||personal)&&board&&<span className="viewer-progress-status" role="status" title={user&&!user.isAnonymous?'Progress is private to your signed-in account':'Progress is stored only in this browser'}>{progressStatus==='saving'?'Saving progress…':progressStatus==='error'?'Progress sync issue':user&&!user.isAnonymous?'Your account progress':'Progress in this browser'}</span>}
        <span className="viewer-readonly">
          <Icon name={live?'Lock':'Eye'} size={15} /> {personal?'Live mode · my additions':live?'Live mode · edit data':publication?.sharing?.audience==='emails'&&board?.blocks.some(b=>b.type==='table'&&b.table.teamAdd)?'Published · team inputs':'Published · interactive'}
        </span>
        {!live&&<button className="btn" onClick={async()=>{if(!user||user.isAnonymous){sessionStorage.setItem('maiboard-save-publication',id);onSignIn?.();return;}try{await bookmarkPublication(id,board.name);setBookmarked(true);}catch(e){setRowError(e.message);}}} disabled={!board||bookmarked}>{bookmarked?'Saved':'Save project'}</button>}
        {live&&<div className="live-save-controls"><span className="live-unsaved">{dirty?'Unsaved changes':'Saved'}</span><IconButton icon="Save" title={saving?'Saving…':'Save Live changes'} disabled={!dirty||saving} onClick={save}/><IconButton icon="Pencil" title="Back to editor" onClick={()=>location.hash=personal?`/saved-edit/${id}`:`/project/${ownerUid}/${id}`}/></div>}
      </nav>
      {rowError&&!rowTarget&&<ErrorMessage>{rowError}</ErrorMessage>}
      <div className={`view-navigation-workspace ${board?.showViewNavigation===true&&board.viewNavigationLayout==='vertical'?'navigation-vertical':''}`}>
      {board && !error && (
        <PresentationTabs
          board={board}
          current={currentView}
          onSelect={setActiveView}
        />
      )}
      {error ? (
        <div className="load-error">
          <h1>This presentation isn’t available.</h1>
          <ErrorMessage>{error}</ErrorMessage>
          {!user&&onSignIn&&<button className="btn primary" onClick={onSignIn}>Sign in for private access</button>}
          <button className="btn" onClick={() => setRetry((v) => v + 1)}>
            Try again
          </button>
        </div>
      ) : !board ? (
        <Spinner text="Opening the bigger picture…" />
      ) : (
        <BoardStage
          onBlockInteraction={interact}
          runtimeStorageKey={cameraKey||`publication/${id}`}
          board={board}
          viewId={currentView}
          onNavigate={setActiveView}
          runtimeTabs={runtimeTabs}
          onTabNavigate={(blockId, tabId) =>
            setRuntimeTabs((s) => ({ ...s, [blockId]: tabId }))
          }
          view={view}
          setView={setView}
          readOnly
          editTableData={live}
          onTableDataChange={changeTable}
          onAddLiveRow={live?openRow:publication?.sharing?.audience==='emails'&&user?.email?openRow:undefined}
          canAddRow={block=>personal?!block.sourceBlock:live||block.table.teamAdd===true}
          canDeleteRow={(block,index)=>!live&&block.table.teamDeleteOwn===true&&block.table.rowMeta?.[index]?.entry&&block.table.rowMeta[index].uid===user?.uid}
          canToggleBoolean={(block,index)=>(!live||(personal&&block.sourceBlock))&&!checkboxPending.has(block.table.rowMeta?.[index]?.id)}
          onToggleBoolean={async(block,index,columnId,checked)=>{if(live||!user||publication?.sharing?.audience!=='emails'||!block.table.rowMeta?.[index]?.entry||block.table.rowMeta[index].uid!==user.uid){interact(block.id,{kind:'boolean',index,columnId,checked});return;}const key=block.table.rowMeta[index].id,column=block.table.columns.findIndex(c=>c.id===columnId),previous=block.table.rows[index][column];const patch=value=>{const apply=current=>({...current,blocks:current.blocks.map(b=>b.id===block.id?{...b,table:{...b.table,rows:b.table.rows.map((r,i)=>i===index?r.map((v,j)=>j===column?value:v):r)}}:b)});progressBase.current=apply(progressBase.current);const next=apply(boardRef.current);boardRef.current=next;setBoard(next);};setCheckboxPending(keys=>new Set([...keys,key]));patch(String(checked));setRowError('');try{await toggleTeamBoolean(id,block,index,columnId,checked);}catch(e){patch(previous);setRowError(readableError(e));}finally{setCheckboxPending(keys=>{const next=new Set(keys);next.delete(key);return next;});}}}
          onDeleteLiveRow={async(block,index)=>{try{await deleteTeamRow(id,block.table.rowMeta[index].id);setRetry(x=>x+1);}catch(e){setRowError(e.message);}}}
          stageRef={stageRef}
        >
          <div className="viewer-caption canvas-overlay">
            <Icon name="Lock" size={13} />
            <span>
              {personal?'My saved additions':live?'Private working project':'Published snapshot'}
              {publishedAt ? ` · ${publishedAt.toLocaleDateString()}` : ""}
            </span>
          </div>
          <div className="canvas-bottom canvas-controls">
            <span>
              Drag the canvas to explore · Tabs and links are interactive
            </span>
            <div className="zoom-controls">
              <IconButton
                icon="ZoomOut"
                title="Zoom out"
                onClick={() => zoom(-0.1)}
              />
              <span>{Math.round(view.z * 100)}%</span>
              <IconButton
                icon="ZoomIn"
                title="Zoom in"
                onClick={() => zoom(0.1)}
              />
              <i />
              <IconButton
                icon="Maximize"
                title="Fit presentation"
                onClick={fit}
              />
            </div>
          </div>
        </BoardStage>
      )}
      </div>
      {leaveAction&&<Modal title="Leave without saving?" onClose={()=>setLeaveAction(null)}><p>Your data changes have not been saved and will not apply if you leave.</p><ErrorMessage>{rowError}</ErrorMessage><div className="modal-actions"><button className="btn" onClick={()=>setLeaveAction(null)}>Keep editing</button><button className="btn danger" onClick={()=>leaveAction()}>Discard changes and leave</button><button className="btn primary" disabled={saving} onClick={async()=>{if(await save())leaveAction();}}>Save and leave</button></div></Modal>}
      {rowTarget && <Modal title={`Add row to ${rowTarget.name}`} onClose={()=>{if(!savingRow)setRowTarget(null)}}><form onSubmit={saveRow}><p>{live?'Add this row, then click Save to apply table changes. Columns and board layout stay fixed.':'Existing rows, columns, and other blocks stay read only.'}</p>{rowTarget.table.columns.map((c,i)=>c.hidden||c.system||(rowTarget.table.personal?.enabled&&rowTarget.table.personal.columnId===c.id)?null:<Field key={c.id} label={c.name}><CellInput column={c} label={`New row ${c.name}`} value={rowValues[i]} onChange={value=>setRowValues(values=>values.map((v,j)=>j===i?value:v))}/></Field>)}<ErrorMessage>{rowError}</ErrorMessage><button className="btn primary" disabled={savingRow}>{savingRow?'Adding…':'Add row'}</button></form></Modal>}
    </div>
  );
}
