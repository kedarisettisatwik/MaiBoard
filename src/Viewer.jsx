import React, { useEffect, useRef, useState } from "react";
import { getPublication, loadProject, addLiveTableRow, bookmarkPublication, addTeamRow, deleteTeamRow } from "./firebase";
import { readableError, viewBlocks, projectViews, startingView, upgradeBoard } from "./model";
import { Logo, Icon, IconButton, Spinner, ErrorMessage, Modal, Field } from "./ui";
import {VerifyEmail} from './Sharing';
import {CellInput} from "./TableControls";
import { PresentationTabs } from "./Views";
import BoardStage, { blockHeight } from "./BoardStage";
export default function Viewer({ id, live=false, user, onSignIn }) {
  const [board, setBoard] = useState(null),
    [publication,setPublication]=useState(null),[bookmarked,setBookmarked]=useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState({ x: 0, y: 0, z: 1 }),
    [publishedAt, setPublishedAt] = useState(null),
    [retry, setRetry] = useState(0),
    [activeView, setActiveView] = useState(null),
    [runtimeTabs, setRuntimeTabs] = useState({}),
    [rowTarget,setRowTarget]=useState(null),[rowValues,setRowValues]=useState([]),[rowError,setRowError]=useState(''),[savingRow,setSavingRow]=useState(false),
    stageRef = useRef();
  useEffect(() => {
    let active = true;
    setError("");setBoard(null);
    (live ? loadProject(user.uid,id) : getPublication(id))
      .then((p) => {
        if (active) {
          setPublication(p);setBoard(upgradeBoard(JSON.parse(p.boardJson)));
          setPublishedAt(p.publishedAt?.toDate?.());
        }
      })
      .catch((e) => {
        if (active) setError(e.code==='permission-denied'?'Sign in with an invited, verified email address. This project may be restricted or no longer shared with you.':readableError(e));
      });
    return () => (active = false);
  }, [id, retry, live, user?.uid]);
  const openRow=(blockId)=>{const block=board.blocks.find(b=>b.id===blockId&&b.type==='table');if(!block||(!live&&!(publication?.sharing?.audience==='emails'&&block.table.teamAdd&&user?.emailVerified)))return;setRowTarget(structuredClone(block));setRowValues(block.table.columns.map(()=>''));setRowError('');};
  const saveRow=async(e)=>{e.preventDefault();setSavingRow(true);setRowError('');try{if(live){const updated=await addLiveTableRow(user.uid,id,rowTarget.id,rowValues,rowTarget.table.columns.map(c=>c.id));setBoard(upgradeBoard(updated));}else{await addTeamRow(id,rowTarget,rowValues);setRetry(x=>x+1);}setRowTarget(null);}catch(e){setRowError(readableError(e));}finally{setSavingRow(false);}};
  useEffect(()=>{if(live||!board||!user||user.isAnonymous||sessionStorage.getItem('maiboard-save-publication')!==id)return;sessionStorage.removeItem('maiboard-save-publication');bookmarkPublication(id,board.name).then(()=>setBookmarked(true)).catch(e=>setRowError(e.message));},[id,board,user?.uid,live]);
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
  }, [board, currentView]);
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
          <Icon name={live?'Lock':'Eye'} size={15} /> {live?'Live mode · add rows only':publication?.sharing?.audience==='emails'&&board?.blocks.some(b=>b.type==='table'&&b.table.teamAdd)?'Published · team inputs':'Published · read only'}
        </span>
        {!live&&<button className="btn" onClick={async()=>{if(!user||user.isAnonymous){sessionStorage.setItem('maiboard-save-publication',id);onSignIn?.();return;}try{await bookmarkPublication(id,board.name);setBookmarked(true);}catch(e){setRowError(e.message);}}} disabled={!board||bookmarked}>{bookmarked?'Saved':'Save project'}</button>}
        {live && <button className="btn" onClick={()=>location.hash=`/project/${id}`}>Back to editor</button>}
      </nav>
      {!live&&<VerifyEmail user={user} onVerified={()=>setRetry(x=>x+1)}/> }
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
          onAddLiveRow={live?openRow:publication?.sharing?.audience==='emails'&&user?.emailVerified?openRow:undefined}
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
      {rowTarget && <Modal title={`Add row to ${rowTarget.name}`} onClose={()=>{if(!savingRow)setRowTarget(null)}}><form onSubmit={saveRow}><p>Existing rows, columns, and other blocks stay read only.</p>{rowTarget.table.columns.map((c,i)=>c.hidden||c.system||(rowTarget.table.personal?.enabled&&rowTarget.table.personal.columnId===c.id)?null:<Field key={c.id} label={c.name}><CellInput column={c} label={`New row ${c.name}`} value={rowValues[i]} onChange={value=>setRowValues(values=>values.map((v,j)=>j===i?value:v))}/></Field>)}<ErrorMessage>{rowError}</ErrorMessage><button className="btn primary" disabled={savingRow}>{savingRow?'Saving…':'Add row'}</button></form></Modal>}
    </div>
  );
}
