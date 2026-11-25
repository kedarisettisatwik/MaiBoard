import React, { useRef, useEffect, useState } from "react";
import {downloadTableCSV} from "./entities";
import { Icon, IconButton, Modal, typeIcons } from "./ui";
import RichText, { SafeHTML } from "./RichText";
import Report from "./Report";
import {CellInput} from "./TableControls";
import {filterTableByBlocks,reportBlocksFor,paginateRows} from "./tableFeatures";
import FilterBlock from "./FilterBlock";
import { TabsBlock, ImageBlock, KanbanBlock } from "./ExtendedBlocks";
import {
  safeUrl,
  minimumBlockHeight,
  defaultStyle,
  uid,
  isBlockVisible,
  viewBlocks,
  projectViews,
  blockIsLocked,
  viewIsLocked,
  presentationTabs,
  presentationTabSource,
} from "./model";
export function blockHeight(b) {
  return b.h || 260;
}
export function edgePath(edge, blocks) {
  const a = blocks.find((b) => b.id === edge.from),
    b = blocks.find((b) => b.id === edge.to);
  if (!a || !b) return "";
  const forward = b.x + b.w / 2 >= a.x + a.w / 2,
    x1 = forward ? a.x + a.w : a.x,
    x2 = forward ? b.x : b.x + b.w,
    y1 = a.y + blockHeight(a) / 2,
    y2 = b.y + blockHeight(b) / 2,
    d = Math.max(60, Math.abs(x2 - x1) / 2) * (forward ? 1 : -1);
  return edge.curve === false
    ? `M${x1},${y1} L${x2},${y2}`
    : `M${x1},${y1} C${x1 + d},${y1} ${x2 - d},${y2} ${x2},${y2}`;
}
export function TableBlock({ block, readOnly, update, onImport, onAddLiveRow, canAddRow, canDeleteRow, onDeleteLiveRow, onToggleBoolean, canToggleBoolean, editData=false, visibleRows }) {
  const { columns, rows } = block.table;
  const [clearing,setClearing]=useState(false),[page,setPage]=useState(1),matching=visibleRows||rows.map((row,index)=>({row,index})),pageData=paginateRows(matching,page,block.table.pageSize,block.table.pagination!==false),rowKey=matching.map(x=>x.index).join(',');
  useEffect(()=>setPage(1),[rowKey,block.table.pageSize,block.table.pagination]);
  const paginationAtTop=(block.table.paginationPosition||'bottom-right').startsWith('top-');
  const pagination=block.table.pagination!==false&&<nav className="table-pagination" data-position={block.table.paginationPosition||'bottom-right'} aria-label={`Pages for ${block.name}`}><button aria-label="Previous table page" disabled={pageData.page===1} onClick={()=>setPage(pageData.page-1)}>Previous</button>{Array.from({length:Math.min(5,pageData.pages)},(_,i)=>Math.max(1,Math.min(pageData.page-2,pageData.pages-4))+i).map(p=><button key={p} aria-label={`Table page ${p}`} aria-current={p===pageData.page?'page':undefined} onClick={()=>setPage(p)}>{p}</button>)}<span>Page {pageData.page} of {pageData.pages}</span><button aria-label="Next table page" disabled={pageData.page===pageData.pages} onClick={()=>setPage(pageData.page+1)}>Next</button></nav>;
  return (
    <>
      {paginationAtTop&&pagination}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c, i) => c.hidden?null:(
                <th key={c.id}>
                  {readOnly ? (
                    c.name
                  ) : (
                    <input
                      aria-label={`Column ${i + 1} name`}
                      value={c.name}
                      onChange={(e) =>
                        update(
                          {
                            table: {
                              ...block.table,
                              columns: columns.map((x) =>
                                x.id === c.id
                                  ? { ...x, name: e.target.value }
                                  : x,
                              ),
                            },
                          },
                          "column-name",
                        )
                      }
                    />
                  )}
                </th>
              ))}
              {(!readOnly||editData||canDeleteRow)&&<th className="row-action"/>}
            </tr>
          </thead>
          <tbody>
            {pageData.rows.map(({row:r,index:i}) => (
              <tr key={i}>
                {columns.map((c, j) => c.hidden?null:(
                  <td key={c.id} style={{color:c.colors?.[r[j]]||undefined}}>
                    {(readOnly&&!editData)||c.system ? (
                      c.type==='boolean'?<input className="boolean-cell" type="checkbox" aria-label={`Row ${i+1}, ${c.name}`} checked={r[j]===true||String(r[j])==='true'} disabled={!canToggleBoolean?.(block,i)} onChange={e=>onToggleBoolean?.(block,i,c.id,e.target.checked)}/>:<span>{r[j]}</span>
                    ) : (
                      <CellInput column={c} label={`Row ${i+1}, ${c.name}`} value={r[j]??''} onChange={value=>update({table:{...block.table,rows:rows.map((row,k)=>k===i?row.map((v,ix)=>ix===j?value:v):row)}},`cell-${i}-${j}`)}/>
                    )}
                  </td>
                ))}
                {readOnly&&!editData&&canDeleteRow&&<td className="row-action">{canDeleteRow(block,i)&&<IconButton icon="Trash2" title="Delete your row" onClick={()=>onDeleteLiveRow(block,i)}/>}</td>}
                {(!readOnly||editData) && (
                  <td className="row-action">
                    <IconButton
                      icon="X"
                      title={`Delete row ${i + 1}`}
                      onClick={() =>
                        update(
                          {
                            table: {
                              ...block.table,
                              rows: rows.filter((_, k) => k !== i),
                              rowMeta: (block.table.rowMeta||rows.map(()=>null)).filter((_,k)=>k!==i),
                            },
                          },
                          "delete-row",
                        )
                      }
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="table-empty">No rows yet. Add a row or import a CSV.</p>
        )}
      </div>
      {clearing&&<Modal title="Clear whole table?" onClose={()=>setClearing(false)}><p>Whole table data will be deleted. All records will be removed; fields will remain. Click Save to apply the change.</p><div className="modal-actions"><button className="btn" onClick={()=>setClearing(false)}>Cancel</button><button className="btn danger filled" onClick={()=>{update({table:{...block.table,rows:[],rowMeta:[]}},"clear-table");setClearing(false);}}>Delete all table data</button></div></Modal>}
      <div className="table-footer">
        <span>
          {visibleRows?.length??rows.length} of {rows.length} rows · {columns.length} columns
        </span>
        <button title="Download CSV" aria-label="Download CSV" onClick={()=>downloadTableCSV(block)}><Icon name="Download" size={13}/> CSV</button>
        {(!readOnly||editData)&&<button className="danger" onClick={()=>setClearing(true)}><Icon name="Trash2" size={13}/> Clear data</button>}
        {readOnly && onAddLiveRow && (!canAddRow||canAddRow(block)) && <button onClick={()=>onAddLiveRow(block.id)}><Icon name="Plus" size={13}/> Add row</button>}
        {!readOnly && (
          <>
            <button
              onClick={() =>
                update(
                  {
                    table: {
                      ...block.table,
                      rows: [...rows, columns.map(() => "")],
                      rowMeta: [...(block.table.rowMeta||rows.map(()=>null)),null],
                    },
                  },
                  "add-row",
                )
              }
            >
              <Icon name="Plus" size={13} /> Row
            </button>
            <button
              aria-label="Add table column"
              onClick={() =>
                update(
                  {
                    table: { ...block.table,
                      columns: [
                        ...columns,
                        { id: uid(), name: `Column ${columns.length + 1}` },
                      ],
                      rows: rows.map((r) => [...r, ""]),
                    },
                  },
                  "add-column",
                )
              }
            >
              <Icon name="Plus" size={13} /> Column
            </button>
            <button onClick={() => onImport?.(block.id)}>
              <Icon name="Upload" size={13} /> CSV
            </button>
          </>
        )}
      </div>
      {!paginationAtTop&&pagination}
    </>
  );
}
function TabCanvas({ board, block, tab, referenceViewId, props }) {
  const [innerView, setInnerView] = useState({ x: 0, y: 0, z: 1 });
  const readonly = props.readOnly || !!referenceViewId;
  const chain = [...(props.excludeIds || []), block.id];
  return (
    <div className="tab-canvas-wrap">
      {chain.length > 6 ? (
        <p className="property-hint">Nested view limit reached.</p>
      ) : (
        <BoardStage
          {...props}
          board={board}
          stageRef={undefined}
          embedded
          interactionScale={(props.interactionScale || 1) * props.view.z}
          view={innerView}
          setView={setInnerView}
          readOnly={readonly}
          viewId={referenceViewId || props.viewId}
          containerId={referenceViewId ? null : block.id}
          containerTabId={tab.id}
          excludeIds={chain}
        />
      )}
    </div>
  );
}
export default function BoardStage({
  board,
  viewId,
  onNavigate,
  view,
  setView,
  selected,
  onSelect,
  onUpdate,
  onBegin,
  onDelete,
  onConnect,
  onEditor,
  onImport,
  onAddLiveRow,
  canAddRow, canDeleteRow, onDeleteLiveRow, onToggleBoolean, canToggleBoolean,
  editTableData=false, onTableDataChange,
  onDuplicate,
  onTransfer,
  onUploadImage,
  onAddToTab,
  onTabNavigate,
  runtimeTabs = {},
  tableFilters, onTableFilters,
  containerId = null,
  containerTabId = null,
  excludeIds = [],
  embedded = false,
  interactionScale = 1,
  tool = "select",
  readOnly = false,
  children,
  stageRef,
}) {
  const [localFilters,setLocalFilters]=useState({}),[dragging,setDragging]=useState(false);
  const filters=tableFilters||localFilters,setFilters=onTableFilters||setLocalFilters;
  const shown = viewBlocks(
    board,
    viewId || board.startViewId || projectViews(board)[0].id,
  ).filter(
    (b) =>
      !excludeIds.includes(b.id) &&
      (containerId
        ? b.tabParentId === containerId && b.tabId === containerTabId
        : !b.tabParentId),
  );
  const [context, setContext] = useState(null);
  useEffect(() => {
    if (!context) return;
    const close = () => setContext(null);
    addEventListener("click", close);
    addEventListener("blur", close);
    const key = (e) => {
      if (e.key === "Escape") close();
    };
    addEventListener("keydown", key);
    return () => {
      removeEventListener("click", close);
      removeEventListener("blur", close);
      removeEventListener("keydown", key);
    };
  }, [context]);
  const internalRef = useRef(),
    root = stageRef || internalRef,
    drag = useRef(null),
    [tabState, setTabState] = useState({});
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const wheel = (e) => {
      if (
        e.target.closest(
          ".table-scroll,.block-content,.rich-editor,.report-content",
        )
      )
        return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect(),
          x = e.clientX - r.left,
          y = e.clientY - r.top;
        setView((v) => {
          const z = Math.min(
            2,
            Math.max(0.2, v.z * (e.deltaY > 0 ? 0.93 : 1.07)),
          );
          return {
            x: x - ((x - v.x) * z) / v.z,
            y: y - ((y - v.y) * z) / v.z,
            z,
          };
        });
      } else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [root, setView]);
  const pointerDown = (e) => {
    if (embedded) e.stopPropagation();
    if (e.button !== 0 || e.target.closest(".canvas-controls,.canvas-overlay"))
      return;
    const blockEl = e.target.closest("[data-block]"),
      edgeEl = e.target.closest("[data-edge]"),
      id = blockEl?.dataset.block;
    if (tool === "connect" && !readOnly && id) {
      e.preventDefault();
      onSelect?.(id);
      onConnect?.(id);
      return;
    }
    if (edgeEl && !readOnly) {
      e.stopPropagation();
      onSelect?.(edgeEl.dataset.edge);
      return;
    }
    const hit=board.blocks.find(b=>b.id===id);
    if(hit?.type==='button'&&!readOnly&&(e.ctrlKey||e.metaKey))return;
    if (id && !readOnly) onSelect?.(id);
    if(hit?.type==='button'&&!readOnly&&tool!=='pan'&&!e.target.closest('.resize-handle')){if(blockIsLocked(board,hit,viewId))return;e.preventDefault();setDragging(true);onBegin?.();drag.current={kind:'block',id,x:e.clientX,y:e.clientY,bx:hit.x,by:hit.y,w:hit.w,h:hit.h,z:view.z*interactionScale,type:'button'};e.currentTarget.setPointerCapture(e.pointerId);return;}
    if (
      e.target.closest(
        'button,input,textarea,select,a,[contenteditable="true"]',
      ) &&
      tool!=="pan" && !e.target.closest(".resize-handle")
    )
      return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    if (id && !readOnly && tool !== "pan") {
      if (
        !e.target.closest(".block-drag") &&
        !e.target.closest(".resize-handle")
      )
        return;
      const b = board.blocks.find((b) => b.id === id);
      if (blockIsLocked(board, b, viewId)) return;
      onBegin?.();
      drag.current = {
        kind: e.target.closest(".resize-handle") ? "resize" : "block",type:b.type,
        id,
        x: e.clientX,
        y: e.clientY,
        bx: b.x,
        by: b.y,
        w: b.w,
        h: blockHeight(b),
        z: view.z * interactionScale,
      };
    } else {
      drag.current = {
        kind: "pan",
        x: e.clientX,
        y: e.clientY,
        bx: view.x,
        by: view.y,
      };
      if (!id) onSelect?.(null);
    }
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const x = e.clientX - d.x,
      y = e.clientY - d.y;
    if (d.kind === "pan") setView((v) => ({ ...v, x: d.bx + x, y: d.by + y }));
    else if (d.kind === "resize")
      onUpdate?.(
        d.id,
        {
          w: Math.max(d.type==="button"?80:d.type==="filter"?140:260, Math.round(d.w + x / d.z)),
          h: Math.max(minimumBlockHeight(board.blocks.find(b=>b.id===d.id)), Math.round(d.h + y / d.z)),
        },
        false,
      );
    else
      onUpdate?.(
        d.id,
        {
          x: Math.max(0, Math.round(d.bx + x / d.z)),
          y: Math.max(0, Math.round(d.by + y / d.z)),
        },
        false,
      );
  };
  return (
    <section
      onContextMenu={(e) => {
        if (embedded) e.stopPropagation();
        const edge = e.target.closest("[data-edge]");
        const b = e.target.closest("[data-block]");
        if (!readOnly && edge) {
          e.preventDefault();
          onSelect?.(edge.dataset.edge);
          setContext({
            id: edge.dataset.edge,
            kind: "edge",
            x: Math.min(e.clientX, innerWidth - 190),
            y: Math.min(e.clientY, innerHeight - 100),
          });
          return;
        }
        if (!readOnly && b) {
          e.preventDefault();
          onSelect?.(b.dataset.block);
          setContext({
            id: b.dataset.block,
            x: Math.min(e.clientX, innerWidth - 190),
            y: Math.min(e.clientY, innerHeight - 205),
          });
        }
      }}
      ref={root}
      className={`board-stage ${dragging?"stage-dragging":""} tool-${tool} ${readOnly ? "readonly" : ""} ${embedded ? "embedded-stage" : ""}`}
      aria-label={readOnly ? "Read-only presentation canvas" : "Project canvas"}
      style={{
        backgroundSize: `${22 * view.z}px ${22 * view.z}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      onPointerDownCapture={e=>{if(tool==='pan'&&!e.target.closest('.canvas-controls,.canvas-overlay')){pointerDown(e);e.stopPropagation();}}}
      onClickCapture={e=>{if(tool==='pan'&&!e.target.closest('.canvas-controls,.canvas-overlay')){e.preventDefault();e.stopPropagation();}}}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={() => {
        drag.current = null;setDragging(false);
      }}
      onPointerCancel={() => {drag.current=null;setDragging(false);}}
      onLostPointerCapture={()=>{drag.current=null;setDragging(false);}}
    >
      <div
        className="canvas-world"
        style={{
          transform: `translate(${view.x}px,${view.y}px) scale(${view.z})`,
        }}
      >
        <svg
          className="connections"
          width="12000"
          height="8000"
          aria-label="Block connections"
        >
          <defs>
            {board.edges.map((e) => (
              <React.Fragment key={e.id}>
                <marker
                  id={`end-${e.id}`}
                  markerWidth="9"
                  markerHeight="9"
                  refX="8"
                  refY="4.5"
                  orient="auto-start-reverse"
                  markerUnits="strokeWidth"
                >
                  <path
                    d="M1 1 L8 4.5 L1 8"
                    fill="none"
                    stroke={e.color}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
              </React.Fragment>
            ))}
          </defs>
          {board.edges.map((e) => (
            <g
              key={e.id}
              data-edge={e.id}
              style={{
                display: [e.from, e.to].every((id) => {
                  const b = board.blocks.find((b) => b.id === id);
                  return b && shown.some((x) => x.id === b.id);
                })
                  ? undefined
                  : "none",
              }}
            >
              <path
                className="edge-hit"
                d={edgePath(e, board.blocks)}
                fill="none"
                stroke="transparent"
                strokeWidth="18"
                style={{ pointerEvents: readOnly ? "none" : "stroke" }}
              />
              <path
                d={edgePath(e, board.blocks)}
                fill="none"
                stroke={selected === e.id ? "#143b86" : e.color || "#848fa4"}
                strokeWidth={e.width || 2}
                strokeDasharray={
                  e.dash === "dotted"
                    ? "1 7"
                    : e.dash === "dashed"
                      ? "9 6"
                      : undefined
                }
                strokeLinecap="round"
                markerStart={e.startArrow ? `url(#end-${e.id})` : undefined}
                markerEnd={e.endArrow ? `url(#end-${e.id})` : undefined}
                pointerEvents="none"
              />
            </g>
          ))}
        </svg>
        {shown
          .slice()
          .sort(
            (a, b) =>
              (a.type === "section" ? 0 : 1) - (b.type === "section" ? 0 : 1),
          )
          .map((block) => {
            const locked = blockIsLocked(board, block, viewId),
              contentReadOnly = readOnly || locked;
            const s = { ...defaultStyle, ...block.style },
              active = selected === block.id,
              tabId = readOnly
                ? tabState[block.id] || block.activeTab
                : block.activeTab,
              tab = block.tabs?.find((t) => t.id === tabId) || block.tabs?.[0];
            const update = (patch, key) => onUpdate?.(block.id, patch, key);
            return (
              <article
                data-block={block.id}
                key={block.id}
                className={`canvas-block type-${block.type} ${readOnly&&block.showHeaderInLive!==true?'header-hidden':''} ${locked ? "locked-block" : ""} ${active && !readOnly ? "selected" : ""}`}
                style={{
                  left: block.x,
                  top: block.y,
                  width: block.w,
                  height: blockHeight(block),
                  boxShadow: block.type==='button'?'none':s.boxShadow===false?'none':'0 5px 18px #1e3a5f10',
                  background: s.background,
                  color: s.color,
                  borderColor: s.borderColor,
                  borderWidth: s.borderWidth,
                  borderRadius: s.radius,
                  opacity: s.opacity,
                  fontFamily: s.fontFamily,
                  fontSize: s.fontSize,
                }}
              >
                {(readOnly?block.showHeaderInLive===true:block.type!=="button")&&<div className="block-drag">
                  <span className="block-type-icon">
                    <Icon name={typeIcons[block.type]} size={15} />
                  </span>
                  {readOnly ? (
                    <span title={block.name}>{block.name}</span>
                  ) : (
                    <input
                      className="block-name-editor"
                      disabled={locked}
                      aria-label={
                        block.type === "table"
                          ? "Table name"
                          : `Name of ${block.name}`
                      }
                      value={block.name}
                      onChange={(e) =>
                        update({ name: e.target.value }, "block-name")
                      }
                    />
                  )}
                  {!readOnly && (
                    <IconButton
                      icon={locked ? "Lock" : "Unlock"}
                      title={`${block.locked ? "Unlock" : "Lock"} block ${block.name}`}
                      disabled={viewIsLocked(board, viewId)}
                      active={locked}
                      onClick={() =>
                        onUpdate?.(block.id, { locked: !block.locked })
                      }
                    />
                  )}
                  {!readOnly && (
                    <span className="drag-grip">
                      <Icon name="GripVertical" size={14} />
                    </span>
                  )}
                </div>}
                {block.type === "table" ? (
                  <TableBlock
                    block={block}
                    readOnly={readOnly}
                    update={editTableData?(patch)=>onTableDataChange?.(block.id,patch.table):update}
                    editData={editTableData}
                    onImport={onImport}
                    onAddLiveRow={onAddLiveRow}
                    canAddRow={canAddRow} canDeleteRow={canDeleteRow} onDeleteLiveRow={onDeleteLiveRow} onToggleBoolean={onToggleBoolean} canToggleBoolean={canToggleBoolean}
                    visibleRows={filterTableByBlocks(block,board.blocks,filters)}
                  />
                ) : block.type === "filter" ? (
                  <FilterBlock locked={readOnly} block={block} blocks={board.blocks} value={filters[block.id]||{}} onChange={value=>setFilters(previous=>({...previous,[block.id]:value}))}/>
                ) : block.type === "report" ? (
                  <Report block={block} blocks={reportBlocksFor(block.report,board.blocks,filters)} />
                ) : block.type === "button" ? (
                  <div
                    className="button-block-content"
                    style={{ padding: 0 }}
                  >
                    <a
                      className="board-link-button"
                      href={["view","next","tab"].includes(block.link.action)?'#':safeUrl(block.link.url)||undefined}
                      target={
                        !["view", "next", "tab"].includes(block.link.action) &&
                        block.link.newTab
                          ? "_blank"
                          : undefined
                      }
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!readOnly&&!e.ctrlKey&&!e.metaKey){e.preventDefault();return;}
                        if (block.link.action === "tab") {
                          e.preventDefault();
                          onTabNavigate?.(
                            block.link.targetTabBlockId,
                            block.link.targetTabId,
                          );
                        } else if (block.link.action === "next") {
                          e.preventDefault();
                          const tabs = presentationTabs(board),
                            index = tabs.findIndex((t) => t.viewId === viewId);
                          if (tabs[index + 1])
                            onNavigate?.(tabs[index + 1].viewId);
                        } else if (block.link.action === "view") {
                          e.preventDefault();
                          if (
                            projectViews(board).some(
                              (v) => v.id === block.link.targetViewId,
                            )
                          )
                            onNavigate?.(block.link.targetViewId);
                        }
                      }}
                      style={{
                        background: s.background,
                        color: s.color,
                        borderRadius: s.radius,
                        boxShadow: s.boxShadow===false?'none':'0 5px 18px #1e3a5f10',
                      }}
                    >
                      {block.link.label}
                      {block.link.showIcon!==false&&<Icon name="ExternalLink" size={16} />}
                    </a>

                  </div>
                ) : block.type === "tabs" ? (
                  <TabsBlock
                    block={block}
                    readOnly={contentReadOnly}
                    update={update}
                    active={active}
                    onEditor={onEditor}
                    padding={s.padding}
                    onNavigate={onNavigate}
                    runtimeTab={runtimeTabs[block.id]}
                    onTabNavigate={onTabNavigate}
                    onAddToTab={onAddToTab}
                    renderCanvas={(tab, referenceViewId) => (
                      <TabCanvas
                        board={board}
                        block={block}
                        tab={tab}
                        referenceViewId={referenceViewId}
                        props={{
                          view,
                          viewId,
                          selected,
                          onSelect,
                          onUpdate,
                          onBegin,
                          onDelete,
                          onDuplicate,
                          onTransfer,
                          onConnect,
                          onEditor,
                          onImport,
                          onAddLiveRow, canAddRow, canDeleteRow, onDeleteLiveRow, onToggleBoolean, canToggleBoolean, editTableData, onTableDataChange,
                          onUploadImage,
                          onAddToTab,
                          onNavigate,
                          onTabNavigate,
                          runtimeTabs,
                          tableFilters:filters,onTableFilters:setFilters,
                          tool,
                          readOnly,
                          interactionScale,
                          excludeIds,
                        }}
                      />
                    )}
                  />
                ) : block.type === "image" ? (
                  <ImageBlock
                    block={block}
                    readOnly={contentReadOnly}
                    update={update}
                    onUpload={onUploadImage}
                  />
                ) : block.type === "kanban" ? (
                  <KanbanBlock
                    block={block}
                    readOnly={contentReadOnly}
                    update={update}
                  />
                ) : block.type === "section" ? (
                  <div className="section-interior" />
                ) : (
                  <div className="block-content" style={{ padding: s.padding }}>
                    {contentReadOnly ? (
                      <SafeHTML html={block.html} />
                    ) : (
                      <RichText
                        value={block.html}
                        active={active}
                        onEditor={onEditor}
                        onChange={(html) => update({ html }, "rich-text")}
                      />
                    )}
                  </div>
                )}
                {active && !readOnly && !locked && (
                  <button
                    className="resize-handle"
                    title="Drag to resize block"
                    aria-label="Resize block"
                  />
                )}
              </article>
            );
          })}
      </div>
      {context && !readOnly && (
        <div
          className="block-context-menu canvas-controls"
          role="menu"
          aria-label="Block actions"
          style={{ position: "fixed", left: context.x, top: context.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {context.kind !== "edge" && (
            <button
              role="menuitem"
              disabled={viewIsLocked(board, viewId)}
              onClick={() => {
                onDuplicate?.(context.id);
                setContext(null);
              }}
            >
              <Icon name="Copy" size={16} /> Duplicate
            </button>
          )}
          {context.kind !== "edge" && (
            <>
              <button
                role="menuitem"
                disabled={projectViews(board).length < 2}
                onClick={() => {
                  onTransfer?.(context.id, "copy");
                  setContext(null);
                }}
              >
                <Icon name="Copy" size={16} /> Copy to view
              </button>
              <button
                role="menuitem"
                disabled={
                  projectViews(board).length < 2 ||
                  blockIsLocked(
                    board,
                    board.blocks.find((b) => b.id === context.id),
                    viewId,
                  )
                }
                onClick={() => {
                  onTransfer?.(context.id, "move");
                  setContext(null);
                }}
              >
                <Icon name="Layers" size={16} /> Move to view
              </button>
            </>
          )}
          <button
            role="menuitem"
            className="context-delete"
            disabled={
              context.kind === "edge"
                ? viewIsLocked(board, viewId)
                : blockIsLocked(
                    board,
                    board.blocks.find((b) => b.id === context.id),
                    viewId,
                  )
            }
            onClick={() => {
              onDelete?.(context.id);
              setContext(null);
            }}
          >
            <Icon name="Trash2" size={16} /> Delete
          </button>
        </div>
      )}
      {children}
    </section>
  );
}
