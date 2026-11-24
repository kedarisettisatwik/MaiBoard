import { blockIsLocked } from "./model";
import React, { useState, useEffect } from "react";
import { Icon, IconButton, typeIcons } from "./ui";
export default function Layers({
  board,
  selected,
  onSelect,
  onVisibility,
  onColumnVisibility,
  onLock,
  onDelete,
  onCopy,
  onTransfer,
  currentView,
  onMove,
  onGroup,
  onRenameGroup,
  onDeleteGroup,
  onClose,
  demo,
}) {
  const [collapsed, setCollapsed] = useState({}),
    [context, setContext] = useState(null);
  useEffect(() => {
    if (!context) return;
    const close = () => setContext(null),
      key = (e) => {
        if (e.key === "Escape") close();
      };
    addEventListener("click", close);
    addEventListener("keydown", key);
    return () => {
      removeEventListener("click", close);
      removeEventListener("keydown", key);
    };
  }, [context]);
  const menu = (e, id, kind = "block") => {
    e.preventDefault();
    e.stopPropagation();
    setContext({
      id,
      kind,
      x: Math.min(e.clientX, innerWidth - 185),
      y: Math.min(e.clientY, innerHeight - 205),
    });
  };
  const toggle = (id) => setCollapsed((s) => ({ ...s, [id]: !s[id] }));
  const drop = (e, destination) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("application/maiboard-layer");
    if (id) onMove(id, destination);
  };
  const blocks = (list) =>
    list.map((b) => (
      <div className="layer-node" key={b.id}>
        <div
          onContextMenu={(e) => menu(e, b.id)}
          className={`layer-row ${selected === b.id ? "selected" : ""}`}
          draggable={!blockIsLocked(board, b, currentView)}
          onDragStart={(e) => {
            e.dataTransfer.setData("application/maiboard-layer", b.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) =>
            drop(
              e,
              b.type === "section"
                ? { parentId: b.id }
                : {
                    parentId: b.parentId || "",
                    groupId: b.groupId || "",
                    beforeId: b.id,
                    tabParentId: b.tabParentId || "",
                    tabId: b.tabId || "",
                  },
            )
          }
        >
          <button
            className="layer-toggle"
            aria-label={`${collapsed[b.id] ? "Expand" : "Collapse"} ${b.name}`}
            onClick={() => toggle(b.id)}
          >
            {["tabs", "table", "section"].includes(b.type) && (
              <Icon
                name={collapsed[b.id] ? "ChevronRight" : "ChevronDown"}
                size={12}
              />
            )}
          </button>
          <button
            className="layer-select"
            draggable={!blockIsLocked(board, b, currentView)}
            onClick={() => onSelect(b.id)}
          >
            <Icon name={typeIcons[b.type]} size={15} />
            <span>{b.name}</span>
          </button>
          <IconButton
            icon={blockIsLocked(board, b, currentView) ? "Lock" : "Unlock"}
            title={`${b.locked ? "Unlock" : "Lock"} ${b.name}`}
            active={blockIsLocked(board, b, currentView)}
            onClick={() => onLock(b.id)}
          />
          <IconButton
            icon={b.hidden ? "EyeOff" : "Eye"}
            title={`${b.hidden ? "Show" : "Hide"} ${b.name}`}
            onClick={() => onVisibility(b.id)}
          />
        </div>
        {b.type === "section" && !collapsed[b.id] && (
          <div className="section-layers">
            {blocks(board.blocks.filter((x) => x.parentId === b.id))}
          </div>
        )}
        {!collapsed[b.id] && b.type === "tabs" && (
          <div className="layer-children">
            {b.tabs.map((t) => (
              <div
                key={t.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(e, { tabParentId: b.id, tabId: t.id })}
              >
                <button onClick={() => onSelect(b.id, t.id)}>
                  <Icon name="Square" size={12} />
                  <span>{t.name}</span>
                </button>
                {blocks(
                  board.blocks.filter(
                    (x) =>
                      x.tabParentId === b.id && x.tabId === t.id && !x.parentId,
                  ),
                )}
              </div>
            ))}
          </div>
        )}
        {!collapsed[b.id] && b.type === "table" && (
          <div className="layer-children">
            {b.table.columns.map((c) => (
              <div className="column-layer-row" key={c.id}>
              <button onClick={() => onSelect(b.id)} className={c.hidden?'column-hidden':''}>
                <Icon name="GripVertical" size={12} />
                <span>{c.name}</span>
              </button>
              <IconButton icon={c.hidden?'EyeOff':'Eye'} title={`${c.hidden?'Show':'Hide'} column ${c.name}`} onClick={()=>onColumnVisibility(b.id,c.id)}/>
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  return (
    <aside className="layers-panel">
      <div className="panel-heading">
        <h2>
          <Icon name="Layers" size={16} /> Layers
        </h2>
        <div>
          <IconButton
            icon="Plus"
            title="Create layer group"
            onClick={onGroup}
          />
          <IconButton
            icon="PanelLeftClose"
            title="Hide layers"
            onClick={onClose}
          />
        </div>
      </div>
      <div
        className="layers-project"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => drop(e, {})}
        title="Drop here to move a block out of its group or section"
      >
        <Icon name="LayoutDashboard" size={15} />
        <strong>{board.name}</strong>
        <span>{board.blocks.length}</span>
      </div>
      <div className="layers-scroll">
        <div
          className="layer-root-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => drop(e, {})}
        >
          Drop here to move to board root
        </div>
        {board.groups.map((g) => (
          <div className="layer-group" key={g.id}>
            <div
              className="layer-row group"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e, { groupId: g.id })}
            >
              <button
                className="layer-toggle"
                onClick={() => toggle(g.id)}
                aria-label={`Toggle ${g.name}`}
              >
                <Icon
                  name={collapsed[g.id] ? "ChevronRight" : "ChevronDown"}
                  size={13}
                />
              </button>
              <button
                className="layer-select"
                onDoubleClick={() => onRenameGroup(g)}
                onClick={() => toggle(g.id)}
              >
                <Icon name="Folder" size={15} />
                <span>{g.name}</span>
              </button>
              <IconButton
                icon="Trash2"
                title={`Ungroup ${g.name}`}
                onClick={() => onDeleteGroup(g.id)}
              />
            </div>
            {!collapsed[g.id] && (
              <div className="group-children">
                {blocks(
                  board.blocks.filter(
                    (b) => b.groupId === g.id && !b.parentId && !b.tabParentId,
                  ),
                )}
                {!board.blocks.some((b) => b.groupId === g.id) && (
                  <small>Assign a block in Properties.</small>
                )}
              </div>
            )}
          </div>
        ))}
        {blocks(
          board.blocks.filter(
            (b) =>
              !b.parentId &&
              !b.tabParentId &&
              (!b.groupId || !board.groups.some((g) => g.id === b.groupId)),
          ),
        )}
        {board.edges.some(e=>board.blocks.some(b=>b.id===e.from)&&board.blocks.some(b=>b.id===e.to)) && (
          <>
            <div className="layer-section-title">Connections</div>
            {board.edges.filter(e=>board.blocks.some(b=>b.id===e.from)&&board.blocks.some(b=>b.id===e.to)).map((e) => (
              <button
                key={e.id}
                onContextMenu={(event) => menu(event, e.id, "edge")}
                className={`edge-layer ${selected === e.id ? "selected" : ""}`}
                onClick={() => onSelect(e.id)}
              >
                <Icon name="MoveUpRight" size={15} />
                <span>
                  {board.blocks.find((b) => b.id === e.from)?.name} /{" "}
                  {board.blocks.find((b) => b.id === e.to)?.name}
                </span>
              </button>
            ))}
          </>
        )}
        {!board.blocks.length && (
          <p className="layers-empty">
            Your canvas is a fresh start.
            <br />
            Add your first block below.
          </p>
        )}
      </div>
      {context && (
        <div
          className="block-context-menu"
          role="menu"
          aria-label="Layer actions"
          style={{ position: "fixed", left: context.x, top: context.y }}
        >
          {context.kind !== "edge" && (
            <button
              role="menuitem"
              onClick={() => {
                onCopy(context.id);
                setContext(null);
              }}
            >
              <Icon name="Copy" size={16} /> Copy
            </button>
          )}
          {context.kind !== "edge" && (
            <>
              <button
                role="menuitem"
                disabled={(board.views?.length || 1) < 2}
                onClick={() => {
                  onTransfer(context.id, "copy");
                  setContext(null);
                }}
              >
                <Icon name="Copy" size={16} /> Copy to view
              </button>
              <button
                role="menuitem"
                disabled={
                  (board.views?.length || 1) < 2 ||
                  blockIsLocked(
                    board,
                    board.blocks.find((b) => b.id === context.id),
                    currentView,
                  )
                }
                onClick={() => {
                  onTransfer(context.id, "move");
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
              context.kind !== "edge" &&
              blockIsLocked(
                board,
                board.blocks.find((b) => b.id === context.id),
                currentView,
              )
            }
            onClick={() => {
              onDelete(context.id);
              setContext(null);
            }}
          >
            <Icon name="Trash2" size={16} /> Delete
          </button>
        </div>
      )}
      <div className="layers-footer">
        <Icon name="Cloud" size={16} />
        <span>{demo ? "Playground · not saved" : "Firebase workspace"}</span>
      </div>
    </aside>
  );
}
