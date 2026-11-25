import {useUnsavedChanges} from './WorkspaceControls';
import {updateLiveTable} from './liveData';
import {appendLiveRow} from './model';
import React, { useEffect, useRef, useState } from "react";
import { getPublication, loadProject, saveProject, bookmarkPublication, addTeamRow, deleteTeamRow } from "./firebase";
import { readableError, viewBlocks, projectViews, startingView, upgradeBoard } from "./model";
import { Logo, Icon, IconButton, Spinner, ErrorMessage, Modal, Field } from "./ui";
import {CellInput} from "./TableControls";
import { PresentationTabs } from "./Views";
import BoardStage, { blockHeight } from "./BoardStage";
export default function Viewer({ id, live=false, user, onSignIn, ownerUid=user?.uid, sessionId }) {
  const [board, setBoard] = useState(null),
    [publication,setPublication]=useState(null),
    [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[leaveAction,setLeaveAction]=useState(null),[bookmarked,setBookmarked]=useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState({ x: 0, y: 0, z: 1 }),
    [publishedAt, setPublishedAt] = useState(null),
    [retry, setRetry] = useState(0),
    [activeView, setActiveView] = useState(null),
    [runtimeTabs, setRuntimeTabs] = useState({}),
    [rowTarget,setRowTarget]=useState(null),[rowValues,setRowValues]=useState([]),[rowError,setRowError]=useState(''),[savingRow,setSavingRow]=useState(false),
    stageRef = useRef(), boardRef=useRef(null),revision=useRef(0);
  boardRef.current=board;
  useUnsavedChanges(live&&dirty,action=>setLeaveAction(()=>action));
  useEffect(() => {
    let active = true;
    setError("");setBoard(null);
    (live ? loadProject(ownerUid,id) : getPublication(id))
      .then((p) => {
        if (active) {
          setPublication(p);const loaded=upgradeBoard(JSON.parse(p.boardJson));boardRef.current=loaded;setBoard(loaded);setDirty(false);revision.current=0;
          setPublishedAt(p.publishedAt?.toDate?.());
        }
      })
      .catch((e) => {
        if (active) setError(e.code==='permission-denied'?'Sign in with an email address that has access. This project may be restricted or no longer shared with you.':readableError(e));
      });
    return () => (active = false);
  }, [id, retry, live, user?.uid,ownerUid]);
  const openRow=(blockId)=>{const block=board.blocks.find(b=>b.id===blockId&&b.type==='table');if(!block||(!live&&!(publication?.sharing?.audience==='emails'&&block.table.teamAdd&&user?.email)))return;setRowTarget(structuredClone(block));setRowValues(block.table.columns.map(()=>''));setRowError('');};
  const saveRow=async(e)=>{e.preventDefault();setSavingRow(true);setRowError('');try{if(live){const current=boardRef.current, appended=appendLiveRow(current,rowTarget.id,rowValues,rowTarget.table.columns.map(c=>c.id)), target=appended.blocks.find(b=>b.id===rowTarget.id);changeTable(rowTarget.id,target.table);}else{await addTeamRow(id,rowTarget,rowValues);setRetry(x=>x+1);}setRowTarget(null);}catch(e){setRowError(readableError(e));}finally{setSavingRow(false);}};
  useEffect(()=>{if(live||!board||!user||user.isAnonymous||sessionStorage.getItem('maiboard-save-publication')!==id)return;sessionStorage.removeItem('maiboard-save-publication');bookmarkPublication(id,board.name).then(()=>setBookmarked(true)).catch(e=>setRowError(e.message));},[id,board,user?.uid,live]);
  const changeTable=(blockId,table)=>{try{const next=updateLiveTable(boardRef.current,blockId,table,user);boardRef.current=next;setBoard(next);revision.current++;setDirty(true);setRowError('');}catch(e){setRowError(e.message);}};
  const save=async()=>{if(!live||!dirty||saving)return false;const snapshot=structuredClone(boardRef.current),at=revision.current;setSaving(true);setRowError('');try{await saveProject(ownerUid,id,snapshot,sessionId);if(at===revision.current)setDirty(false);return at===revision.current;}catch(e){setRowError(readableError(e));return false;}finally{setSaving(false);}};
  const currentView = activeView || (board ? startingView(board) : "view-1");
  const fit = () => {
    if (!board) return;
    const blocks = viewBlocks(board, currentView).filter((b) => !b.tabParentId);
    if (!blocks.length) {
      setView({ x: 0, y: 0, z: 1 });
      return;
    }
    const r = stageRef.current.getBoundingClientRect(),
      minX = Math.min(...blocks.map((b) => b.x)),
      minY = Math.min(...blocks.map((b) => b.y)),
      maxX = Math.max(...blocks.map((b) => b.x + b.w)),
      maxY = Math.max(...blocks.map((b) => b.y + blockHeight(b))),
      z = Math.min(
        1.25,
        (r.width - 80) / (maxX - minX),
        (r.height - 140) / (maxY - minY),
      );
    setView({
      x: (r.width - (maxX - minX) * z) / 2 - minX * z,
      y: (r.height - 60 - (maxY - minY) * z) / 2 - minY * z,
      z,
    });
  };
  useEffect(() => {
    if (board) requestAnimationFrame(fit);
  }, [!!board, currentView]);
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
        <span className="viewer-readonly">
          <Icon name={live?'Lock':'Eye'} size={15} /> {live?'Live mode · edit table data':publication?.sharing?.audience==='emails'&&board?.blocks.some(b=>b.type==='table'&&b.table.teamAdd)?'Published · team inputs':'Published · read only'}
        </span>
        {!live&&<button className="btn" onClick={async()=>{if(!user||user.isAnonymous){sessionStorage.setItem('maiboard-save-publication',id);onSignIn?.();return;}try{await bookmarkPublication(id,board.name);setBookmarked(true);}catch(e){setRowError(e.message);}}} disabled={!board||bookmarked}>{bookmarked?'Saved':'Save project'}</button>}
        {live&&<div className="live-save-controls"><span className="live-unsaved">{dirty?'Unsaved changes':'Saved'}</span><button className="btn primary" disabled={!dirty||saving} onClick={save}>{saving?'Saving…':'Save'}</button><button className="btn" onClick={()=>location.hash=`/project/${ownerUid}/${id}`}>Back to editor</button></div>}
      </nav>
      {rowError&&!rowTarget&&<ErrorMessage>{rowError}</ErrorMessage>}
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
          canAddRow={block=>live||block.table.teamAdd===true}
          canDeleteRow={(block,index)=>!live&&block.table.teamDeleteOwn===true&&block.table.rowMeta?.[index]?.entry&&block.table.rowMeta[index].uid===user?.uid}
          onDeleteLiveRow={async(block,index)=>{try{await deleteTeamRow(id,block.table.rowMeta[index].id);setRetry(x=>x+1);}catch(e){setRowError(e.message);}}}
          stageRef={stageRef}
        >
          <div className="viewer-caption canvas-overlay">
            <Icon name="Lock" size={13} />
            <span>
              {live?'Private working project':'Published snapshot'}
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
      {leaveAction&&<Modal title="Leave without saving?" onClose={()=>setLeaveAction(null)}><p>Your table changes have not been saved and will not apply if you leave.</p><ErrorMessage>{rowError}</ErrorMessage><div className="modal-actions"><button className="btn" onClick={()=>setLeaveAction(null)}>Keep editing</button><button className="btn danger" onClick={()=>leaveAction()}>Discard changes and leave</button><button className="btn primary" disabled={saving} onClick={async()=>{if(await save())leaveAction();}}>Save and leave</button></div></Modal>}
      {rowTarget && <Modal title={`Add row to ${rowTarget.name}`} onClose={()=>{if(!savingRow)setRowTarget(null)}}><form onSubmit={saveRow}><p>{live?'Add this row, then click Save to apply table changes. Columns and board layout stay fixed.':'Existing rows, columns, and other blocks stay read only.'}</p>{rowTarget.table.columns.map((c,i)=>c.hidden||c.system||(rowTarget.table.personal?.enabled&&rowTarget.table.personal.columnId===c.id)?null:<Field key={c.id} label={c.name}><CellInput column={c} label={`New row ${c.name}`} value={rowValues[i]} onChange={value=>setRowValues(values=>values.map((v,j)=>j===i?value:v))}/></Field>)}<ErrorMessage>{rowError}</ErrorMessage><button className="btn primary" disabled={savingRow}>{savingRow?'Adding…':'Add row'}</button></form></Modal>}
    </div>
  );
}
