import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  loadProject,
  saveProject,
  uploadCSV,
  uploadImage,
  downloadCSV,
  publishProject,
  unpublishProject,
  createProject,
  removeCSV,
} from "./firebase";
import {
  sampleBoard,
  newBlock,
  uid,
  parseCSV,
  deleteBlock,
  duplicateBlock,
  readableError,
  numeric,
  boardBytes,
  updateBoardBlock,
  relocateLayer,
  projectViews,
  startingView,
  viewIsLocked,
  blockIsLocked,
  canUpdateBlock,
  transferToView,
  upgradeBoard,
  viewBlocks,
} from "./model";
import {
  Logo,
  Icon,
  IconButton,
  Spinner,
  ErrorMessage,
  Modal,
  Field,
} from "./ui";
import BoardStage, { blockHeight } from "./BoardStage";
import Properties from "./Properties";
import Layers from "./Layers";
import Views, { PresentationTabs } from "./Views";
export default function Editor({
  id,
  user,
  demo = false,
  initialBoard,
  notify,
  onExit,
  onLogout,
  onSignIn,
}) {
  const [board, setBoard] = useState(
      demo ? (initialBoard || sampleBoard("A little room to explore")) : null,
    ),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState(null),
    [tool, setTool] = useState("select"),
    [view, setView] = useState({ x: 0, y: 0, z: 0.85 }),
    [layers, setLayers] = useState(innerWidth > 800),
    [properties, setProperties] = useState(innerWidth > 1100),
    [saveState, setSaveState] = useState("saved"),
    [saveError, setSaveError] = useState(""),
    [modal, setModal] = useState(null),
    [groupName, setGroupName] = useState(""),
    [publicationId, setPublicationId] = useState(null),
    [busy, setBusy] = useState(false),
    [uploadTarget, setUploadTarget] = useState(null),
    [uploading, setUploading] = useState(false),
    [dirty, setDirty] = useState(false),
    [present, setPresent] = useState(false),
    [activeViewId, setActiveViewId] = useState(null),
    [runtimeTabs, setRuntimeTabs] = useState({});
  const currentView =
    activeViewId || board?.startViewId || board?.views?.[0]?.id || "view-1";
  const boardRef = useRef(board),
    version = useRef(0),
    savedVersion = useRef(0),
    queue = useRef(Promise.resolve()),
    undo = useRef([]),
    redo = useRef([]),
    lastEdit = useRef({}),
    source = useRef(null),
    fileInput = useRef(),
    stageRef = useRef(),
    activeEditor = useRef(null);
  const onEditor = useCallback((editor) => (activeEditor.current = editor), []),
    draftKey = `maiboard-draft:${user?.uid}:${id}`;
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    setLoadError("");
    loadProject(user.uid, id)
      .then((p) => {
        if (cancelled) return;
        let b = upgradeBoard(JSON.parse(p.boardJson));
        b.groups ||= [];
        b.csvFiles ||= [];
        let draft;
        try {
          draft = JSON.parse(localStorage.getItem(draftKey));
        } catch {}
        if (
          draft?.at > (p.updatedAt?.toMillis?.() || 0) &&
          draft.board?.version === 2
        ) {
          b = draft.board;
          version.current = 1;
          setDirty(true);
          notify("Recovered your unsaved changes.");
        }
        boardRef.current = b;
        setBoard(b);
        setPublicationId(p.publicationId || null);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(readableError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.uid, demo, draftKey, notify, retry]);
  const checkpoint = useCallback((key = true) => {
    const now = Date.now();
    if (
      key !== true &&
      lastEdit.current.key === key &&
      now - lastEdit.current.at < 800
    ) {
      lastEdit.current.at = now;
      return;
    }
    undo.current.push(structuredClone(boardRef.current));
    if (undo.current.length > 60) undo.current.shift();
    redo.current = [];
    lastEdit.current = { key, at: now };
  }, []);
  const change = useCallback(
    (fn, key = true) => {
      if (!boardRef.current) return;
      if (key !== false) checkpoint(key);
      const next = typeof fn === "function" ? fn(boardRef.current) : fn;
      boardRef.current = next;
      version.current++;
      setBoard(next);
      setDirty(true);
      setSaveState("unsaved");
    },
    [checkpoint],
  );
  const updateBlock = useCallback(
    (blockId, patch, key = true) => {
      const b = boardRef.current,
        block = b.blocks.find((x) => x.id === blockId);
      if (!block || !canUpdateBlock(b, block, patch, currentView)) return;
      change(
        (p) => updateBoardBlock(p, blockId, patch),
        key === false
          ? false
          : typeof key === "string"
            ? `${blockId}:${key}`
            : true,
      );
    },
    [change, currentView],
  );
  const updateEdge = (edgeId, patch, key = true) => {
    if (viewIsLocked(boardRef.current, currentView)) return;
    change(
      (b) => ({
        ...b,
        edges: b.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
      }),
      typeof key === "string" ? `${edgeId}:${key}` : key,
    );
  };
  const persist = useCallback(async () => {
    if (demo || !boardRef.current || version.current === savedVersion.current)
      return true;
    const snapshot = structuredClone(boardRef.current),
      revision = version.current;
    setSaveState("saving");
    setSaveError("");
    try {
      const task = queue.current
        .catch(() => {})
        .then(() => saveProject(user.uid, id, snapshot));
      queue.current = task;
      await task;
      savedVersion.current = Math.max(savedVersion.current, revision);
      if (version.current === revision) {
        setDirty(false);
        setSaveState("saved");
        try {
          localStorage.removeItem(draftKey);
        } catch {}
      }
      return true;
    } catch (e) {
      setSaveState("error");
      setSaveError(readableError(e));
      return false;
    }
  }, [demo, user?.uid, id, draftKey]);
  useEffect(() => {
    if (!board || !dirty || demo) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), board }));
    } catch {}
    const timer = setTimeout(persist, 700);
    return () => clearTimeout(timer);
  }, [board, dirty, demo, draftKey, persist]);
  useEffect(() => {
    const leave = (e) => {
      if (!demo && version.current !== savedVersion.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("beforeunload", leave);
    return () => removeEventListener("beforeunload", leave);
  }, [demo]);
  const select = useCallback(
    (blockId, tabId) => {
      setSelected(blockId);
      if (blockId) {
        const child = boardRef.current.blocks.find((b) => b.id === blockId);
        if (child?.tabParentId)
          updateBlock(
            child.tabParentId,
            { activeTab: child.tabId },
            "tab-switch",
          );
      }
      if (blockId && innerWidth > 1000) setProperties(true);
      if (tabId) updateBlock(blockId, { activeTab: tabId }, "tab-switch");
    },
    [updateBlock],
  );
  const add = (type, tabParentId, tabId, reportKind) => {
    if (viewIsLocked(boardRef.current, currentView)) {
      notify("Unlock this view to add blocks.");
      return;
    }
    const r = stageRef.current.getBoundingClientRect(),
      x = Math.max(20, Math.round((r.width / 2 - view.x) / view.z - 170)),
      y = Math.max(40, Math.round((r.height / 2 - view.y) / view.z - 100)),
      b = newBlock(type, x, y);
    source.current=null;setTool("select");
    b.viewId = currentView;
    if (tabParentId) {
      b.tabParentId = tabParentId;
      b.tabId = tabId;
      b.x =
        20 +
        boardRef.current.blocks.filter(
          (x) => x.tabParentId === tabParentId && x.tabId === tabId,
        ).length *
          45;
      b.y = 20;
    }
    b.h =
      type === "text"
        ? 310
        : type === "table"
          ? 310
          : type === "button"
            ? 48
            : type === "report"
              ? 360
              : 290;
    if (["section", "image", "kanban"].includes(type)) b.h = newBlock(type).h;
    if (type === "report") {
      const t = boardRef.current.blocks.find((b) => b.type === "table");
      if (t) {
        const col =
          t.table.columns.find(
            (c, i) => i > 0 && t.table.rows.some((r) => numeric(r[i]) !== null),
          ) ||
          t.table.columns[1] ||
          t.table.columns[0];
        b.report = {
          ...b.report,
          tableId: t.id,
          labelColumn: t.table.columns[0].id,
          valueColumn: col.id,
        };
      }
    }
    if(reportKind==='card'){b.name='Report card';b.w=260;b.h=195;b.report={...b.report,kind:'card',metric:'max',decimals:0};}
    change((p) => ({
      ...p,
      blocks: [
        ...p.blocks.map((x) =>
          x.id === tabParentId
            ? {
                ...x,
                w: Math.max(x.w, 680),
                h: Math.max(x.h, 530),
                activeTab: tabId,
                tabs: x.tabs.map((t) =>
                  t.id === tabId
                    ? { ...t, viewId: "", contentType: "blocks" }
                    : t,
                ),
              }
            : x,
        ),
        b,
      ],
    }));
    select(b.id);
    setTool("select");
  };
  const connect = (id) => {
    if (viewIsLocked(boardRef.current, currentView)) {
      notify("Unlock this view to edit connections.");
      return;
    }
    if (!source.current) {
      source.current = id;
      notify("Now select the destination block.");
      return;
    }
    if (source.current === id) {
      notify("Select a different destination block.");
      return;
    }
    const from = source.current;
    change((b) => ({
      ...b,
      edges: [
        ...b.edges,
        {
          id: uid(),
          from,
          to: id,
          color: "#77839a",
          width: 2,
          dash: "solid",
          startArrow: false,
          endArrow: true,
          curve: true,
        },
      ],
    }));
    source.current = null;
    setTool("select");
    notify("Blocks connected.");
  };
  const openTransfer = (blockId, mode) => {
    const candidates = projectViews(boardRef.current).filter(
      (v) => v.id !== currentView,
    );
    if (!candidates.length) {
      notify("Create another view first.");
      return;
    }
    setModal({
      type: "transfer",
      blockId,
      mode,
      targetViewId: candidates[0].id,
    });
  };
  const duplicate = (blockId) => {
    if (viewIsLocked(boardRef.current, currentView)) {
      notify("Unlock this view to duplicate blocks.");
      return;
    }
    const before = boardRef.current,
      source = before.blocks.find((b) => b.id === blockId),
      next = duplicateBlock(before, blockId);
    change(next);
    const copy = next.blocks.find(
      (b) =>
        !before.blocks.some((x) => x.id === b.id) &&
        b.name === source?.name + " copy",
    );
    if (copy) setSelected(copy.id);
  };
  const removeId = (blockId) => {
    const b = boardRef.current,
      block = b.blocks.find((x) => x.id === blockId);
    if (
      block
        ? blockIsLocked(b, block, currentView)
        : viewIsLocked(b, currentView)
    ) {
      notify("Unlock it before deleting.");
      return;
    }
    change((b) =>
      block
        ? deleteBlock(b, blockId)
        : { ...b, edges: b.edges.filter((e) => e.id !== blockId) },
    );
    setSelected(null);
  };
  const removeSelected = () => {
    if (selected) removeId(selected);
  };
  const history = (direction) => {
    const from = direction === "undo" ? undo : redo,
      to = direction === "undo" ? redo : undo;
    if (!from.current.length) return;
    to.current.push(structuredClone(boardRef.current));
    const b = from.current.pop();
    lastEdit.current = {};
    change(b, false);
  };
  const fit = useCallback(() => {
    const original = boardRef.current;
    const b = original
      ? {
          ...original,
          blocks: viewBlocks(original, currentView).filter(
            (b) => !b.tabParentId,
          ),
        }
      : null;
    if (!b?.blocks.length) {
      setView({ x: 0, y: 0, z: 1 });
      return;
    }
    const minX = Math.min(...b.blocks.map((b) => b.x)),
      minY = Math.min(...b.blocks.map((b) => b.y)),
      maxX = Math.max(...b.blocks.map((b) => b.x + b.w)),
      maxY = Math.max(...b.blocks.map((b) => b.y + blockHeight(b))),
      r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    const z = Math.max(
      0.15,
      Math.min(
        1.15,
        (r.width - 100) / (maxX - minX),
        (r.height - 160) / (maxY - minY),
      ),
    );
    setView({
      x: (r.width - (maxX - minX) * z) / 2 - minX * z,
      y: 20 + (r.height - 160 - (maxY - minY) * z) / 2 - minY * z,
      z,
    });
  }, [currentView]);
  useEffect(() => {
    if (board) {
      setSelected(null);
      requestAnimationFrame(fit);
    }
  }, [currentView, fit]);
  const zoom = (by) =>
    setView((v) => {
      const r = stageRef.current.getBoundingClientRect(),
        z = Math.max(0.2, Math.min(2, v.z + by));
      return {
        x: r.width / 2 - ((r.width / 2 - v.x) * z) / v.z,
        y: r.height / 2 - ((r.height / 2 - v.y) * z) / v.z,
        z,
      };
    });
  useEffect(() => {
    if (board && version.current === 0) requestAnimationFrame(fit);
  }, [Boolean(board), fit]);
  const requestImport = (blockId) => {
    if (
      blockIsLocked(
        boardRef.current,
        boardRef.current.blocks.find((b) => b.id === blockId),
        currentView,
      )
    ) {
      notify("Unlock the table before replacing CSV data.");
      return;
    }
    if (demo) {
      notify("Sign in to save CSV files to your Firebase workspace.");
      return;
    }
    setUploadTarget(blockId);
    fileInput.current.click();
  };
  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      notify("Choose a .csv file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("CSV files must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const table = parseCSV(await file.text());
      const proposed = {
        ...boardRef.current,
        blocks: boardRef.current.blocks.map((b) =>
          b.id === uploadTarget ? { ...b, table } : b,
        ),
      };
      if (boardBytes(proposed) > 750000)
        throw Error(
          "This CSV would make the board too large. Use fewer rows or columns.",
        );
      const csv = await uploadCSV(user.uid, id, file);
      if (!boardRef.current.blocks.some((b) => b.id === uploadTarget)) {
        await removeCSV(csv);
        return;
      }
      change((b) => ({
        ...b,
        csvFiles: [...(b.csvFiles || []), csv],
        blocks: b.blocks.map((x) =>
          x.id === uploadTarget ? { ...x, table, csv } : x,
        ),
      }));
      notify("CSV imported. Table values are ready to edit.");
    } catch (e) {
      notify(readableError(e));
    } finally {
      setUploading(false);
    }
  };
  useEffect(() => {
    const keyboard = (e) => {
      if (e.key === "Escape") {
        source.current = null;
        setTool("select");
        if (present) setPresent(false);
      }
      if (
        document.querySelector("dialog[open]") ||
        e.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      const cmd = e.ctrlKey || e.metaKey;
      if (cmd && e.key.toLowerCase() === "z") {
        e.preventDefault();
        history(e.shiftKey ? "redo" : "undo");
        return;
      }
      if (cmd && e.key.toLowerCase() === "s") {
        e.preventDefault();
        persist();
        return;
      }
      if (cmd && e.key.toLowerCase() === "d" && selected) {
        e.preventDefault();
        duplicate(selected);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selected) {
          e.preventDefault();
          removeSelected();
        }
        return;
      }
      if (cmd || e.altKey || present) return;
      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "h":
          setTool("pan");
          break;
        case "t":
          add("text");
          break;
        case "c":
          source.current = null;
          setTool("connect");
          break;
        case "f":
          fit();
          break;
        case "?":
          setModal({ type: "help" });
          break;
      }
    };
    addEventListener("keydown", keyboard);
    return () => removeEventListener("keydown", keyboard);
  });
  const exit = async (action) => {
    if (await persist()) action();
    else setModal({ type: "leave", action });
  };
  const publish = async () => {
    setBusy(true);
    try {
      if (!(await persist())) return;
      const result = await publishProject(
        user.uid,
        id,
        boardRef.current,
        publicationId,
      );
      setPublicationId(result);
      notify("Published a read-only snapshot.");
    } catch (e) {
      notify(readableError(e));
    } finally {
      setBusy(false);
    }
  };
  if (loadError)
    return (
      <div className="load-error">
        <Logo onClick={onExit} />
        <h1>We couldn’t open this project.</h1>
        <ErrorMessage>{loadError}</ErrorMessage>
        <div className="modal-actions">
          <button className="btn" onClick={onExit}>
            Back to projects
          </button>
          <button
            className="btn primary"
            onClick={() => setRetry((v) => v + 1)}
          >
            Try again
          </button>
        </div>
      </div>
    );
  if (!board) return <Spinner text="Opening your canvas…" />;
  const shareUrl = publicationId
      ? `${location.origin}${location.pathname}#/view/${publicationId}`
      : "",
    name = user?.displayName || user?.email?.split("@")[0] || "Explorer";
  return (
    <div className={`editor-app ${present ? "presentation-mode" : ""}`}>
      <header className="editor-header">
        <div className="editor-header-left">
          <IconButton
            icon="ArrowLeft"
            title="Back to projects"
            onClick={() => exit(onExit)}
          />
          <Logo onClick={() => exit(onExit)} />
          <span className="nav-divider" />
          <input
            className="project-name-input"
            aria-label="Project name"
            maxLength={100}
            value={board.name}
            onChange={(e) =>
              change((b) => ({ ...b, name: e.target.value }), "project-name")
            }
            disabled={present}
          />
          <span className="editor-badge">
            {demo ? "Playground" : "Project"}
          </span>
        </div>
        <div className="editor-header-actions">
          {demo ? (
            <>
              <button
                className="btn"
                onClick={() => {
                  setActiveViewId(startingView(board));
                  setRuntimeTabs({});
                  setPresent(true);
                  requestAnimationFrame(fit);
                }}
              >
                <Icon name="Globe" size={16} /> Publish preview
              </button>
              <button
                className="btn primary"
                disabled={busy}
                onClick={async () => {
                  if (user) {
                    if(busy)return;
                    setBusy(true);
                    try {
                      const projectId = await createProject(user.uid, board);
                      location.hash = `/project/${projectId}`;
                    } catch (e) {
                      notify(readableError(e));
                    } finally {setBusy(false);}
                  } else onSignIn();
                }}
              >
                {user ? "Save project" : "Sign in to save"}
              </button>
            </>
          ) : (
            <>
              <button
                className={`save-status ${saveState === "error" ? "failed" : ""}`}
                onClick={persist}
                title="Save now"
              >
                <Icon
                  name={
                    saveState === "saved"
                      ? "Check"
                      : saveState === "saving"
                        ? "Loader2"
                        : saveState === "error"
                          ? "AlertCircle"
                          : "Cloud"
                  }
                  size={14}
                  className={saveState === "saving" ? "spin" : ""}
                />
                {saveState === "saved"
                  ? "All changes saved"
                  : saveState === "saving"
                    ? "Saving…"
                    : saveState === "error"
                      ? "Save failed"
                      : "Unsaved changes"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  exit(()=>{location.hash=`/live/${id}`});
                }}
              >
                <Icon name="Lock" size={16} /> Live mode
              </button>
              <button
                className="btn primary"
                onClick={() => setModal({ type: "publish" })}
              >
                <Icon name="Globe" size={16} /> Publish
              </button>
              <div className="account-menu">
                <span className="user-avatar" title={name}>
                  {name[0].toUpperCase()}
                </span>
                <IconButton
                  icon="LogOut"
                  title="Save and log out"
                  onClick={() => exit(onLogout)}
                />
              </div>
            </>
          )}
          {present && (
            <button
              className="btn primary exit-presentation"
              onClick={() => setPresent(false)}
            >
              Exit presentation
            </button>
          )}
        </div>
      </header>
      {saveError && (
        <div className="save-error-bar">
          <ErrorMessage>
            {saveError} Your edits are backed up in this browser.
          </ErrorMessage>
          <button className="btn" onClick={persist}>
            Retry save
          </button>
        </div>
      )}
      <div className="editor-subbar">
        <div>
          <Icon name="LayoutDashboard" size={15} />
          <strong>Board</strong>
          <Views
            board={board}
            current={currentView}
            onSelect={setActiveViewId}
            change={change}
          />
          <span className="subbar-separator" />
          {board.blocks.length} blocks
        </div>
        <span>
          {demo
            ? "Try it out. This playground is not saved."
            : "Your thinking, with a little more room."}
        </span>
        <div>
          {!layers && (
            <IconButton
              icon="Layers"
              title="Show layers"
              onClick={() => setLayers(true)}
            />
          )}
          <IconButton
            icon="Settings2"
            title="Toggle properties"
            active={properties}
            onClick={() => setProperties((p) => !p)}
          />
          <IconButton
            icon="MoreHorizontal"
            title="Canvas guide"
            onClick={() => setModal({ type: "help" })}
          />
        </div>
      </div>
      {present && (
        <PresentationTabs
          board={board}
          current={currentView}
          onSelect={setActiveViewId}
        />
      )}
      <div className="editor-body">
        {layers && !present && (
          <Layers
            demo={demo}
            board={{
              ...board,
              blocks: board.blocks.filter(
                (b) =>
                  b.viewId === "*" ||
                  (b.viewId || projectViews(board)[0].id) === currentView,
              ),
            }}
            selected={selected}
            onSelect={select}
            onMove={(blockId, destination) => {
              if (
                !blockIsLocked(
                  boardRef.current,
                  boardRef.current.blocks.find((b) => b.id === blockId),
                  currentView,
                )
              )
                change((b) => relocateLayer(b, blockId, destination));
            }}
            currentView={currentView}
            onDelete={removeId}
            onCopy={duplicate}
            onTransfer={openTransfer}
            onLock={(blockId) => {
              const block = boardRef.current.blocks.find(
                (b) => b.id === blockId,
              );
              updateBlock(blockId, { locked: !block.locked });
            }}
            onVisibility={(blockId) => {
              const b = boardRef.current.blocks.find((x) => x.id === blockId);
              updateBlock(blockId, { hidden: !b.hidden });
            }}
            onClose={() => setLayers(false)}
            onGroup={() => {
              setGroupName("");
              setModal({ type: "group" });
            }}
            onRenameGroup={(g) => {
              setGroupName(g.name);
              setModal({ type: "group", group: g });
            }}
            onDeleteGroup={(groupId) =>
              change((b) => ({
                ...b,
                groups: b.groups.filter((g) => g.id !== groupId),
                blocks: b.blocks.map((x) =>
                  x.groupId === groupId ? { ...x, groupId: "" } : x,
                ),
              }))
            }
          />
        )}
        <BoardStage
          board={board}
          viewId={currentView}
          onNavigate={setActiveViewId}
          runtimeTabs={runtimeTabs}
          onTabNavigate={(blockId, tabId) => {
            const block = boardRef.current.blocks.find(
              (b) => b.id === blockId && b.type === "tabs",
            );
            if (block?.tabs.some((t) => t.id === tabId)) {
              setRuntimeTabs((s) => ({ ...s, [blockId]: tabId }));
              if (!present)
                updateBlock(blockId, { activeTab: tabId }, "tab-switch");
            }
          }}
          onAddToTab={add}
          view={view}
          setView={setView}
          selected={selected}
          onSelect={select}
          tool={tool}
          onUpdate={updateBlock}
          onBegin={() => checkpoint()}
          onConnect={connect}
          onImport={requestImport}
          onDelete={removeId}
          onDuplicate={duplicate}
          onTransfer={openTransfer}
          onUploadImage={async (file) => {
            if (
              !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
                file.type,
              ) ||
              file.size > 5 * 1024 * 1024
            )
              throw Error("Use a PNG, JPEG, WebP or GIF image up to 5 MB.");
            if (demo) {
              if (file.size > 400000)
                throw Error(
                  "Use an image under 400 KB in the unsaved playground.",
                );
              return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ src: reader.result });
                reader.onerror = () =>
                  reject(Error("Image could not be read."));
                reader.readAsDataURL(file);
              });
            }
            const image = await uploadImage(user.uid, id, file);
            change((b) => ({
              ...b,
              imageFiles: [...(b.imageFiles || []), { path: image.path }],
            }));
            return image;
          }}
          onEditor={onEditor}
          readOnly={present}
          stageRef={stageRef}
        >
          {!viewBlocks(board, currentView).length && (
            <div className="canvas-empty canvas-overlay">
              <span>
                <Icon name="Layers" size={32} />
              </span>
              <h2>It starts with a little space.</h2>
              <p>Add a text block, a table, or a new perspective.</p>
              <button className="btn primary" onClick={() => add("text")}>
                <Icon name="Plus" size={17} /> Add your first block
              </button>
            </div>
          )}
          {!present && (
            <div className="canvas-toolbar canvas-controls">
              <div id="text-tools-dock" />
              <div className="canvas-default-tools">
                <Tool
                  icon="MousePointer2"
                  title="Select (V)"
                  active={tool === "select"}
                  onClick={() => {
                    source.current = null;
                    setTool("select");
                  }}
                />
                <Tool
                  icon="Hand"
                  title="Move canvas (H)"
                  active={tool === "pan"}
                  onClick={() => {source.current=null;setTool("pan");}}
                />
                <i />
                <Tool
                  icon="Type"
                  title="Text block (T)"
                  onClick={() => add("text")}
                />
                <Tool
                  icon="Table2"
                  title="Table block"
                  onClick={() => add("table")}
                />
                <Tool
                  icon="PanelsTopLeft"
                  title="Tabs block"
                  onClick={() => add("tabs")}
                />
                <Tool
                  icon="Link2"
                  title="Link button"
                  onClick={() => add("button")}
                />
                <Tool
                  icon="BarChart3"
                  title="Chart from a table"
                  onClick={() => add("report")}
                />
                <Tool icon="LayoutDashboard" title="Report card" onClick={()=>add("report",null,null,"card")}/>
                <Tool
                  icon="Image"
                  title="Image block"
                  onClick={() => add("image")}
                />
                <Tool
                  icon="RectangleHorizontal"
                  title="Section block"
                  onClick={() => add("section")}
                />
                <Tool
                  icon="Columns3"
                  title="K board"
                  onClick={() => add("kanban")}
                />
                <i />
                <Tool
                  icon="MoveUpRight"
                  title="Connect blocks (C)"
                  active={tool === "connect"}
                  onClick={() => {
                    source.current = null;
                    setTool(current=>current==='connect'?'select':'connect');
                    if(tool!=='connect')notify("Select a source block, then its destination.");
                  }}
                />
              </div>
            </div>
          )}
          <div className="canvas-bottom canvas-controls">
            <span>
              {tool === "connect"
                ? "Select two blocks to connect them"
                : present
                  ? "Read-only preview · Escape to return"
                  : "Drag a block by its header · Ctrl + scroll to zoom"}
            </span>
            <div className="zoom-controls">
              {!present && (
                <>
                  <IconButton
                    icon="Undo2"
                    title="Undo"
                    disabled={!undo.current.length}
                    onClick={() => history("undo")}
                  />
                  <IconButton
                    icon="Redo2"
                    title="Redo"
                    disabled={!redo.current.length}
                    onClick={() => history("redo")}
                  />
                  <i />
                </>
              )}
              <IconButton
                icon="ZoomOut"
                title="Zoom out"
                onClick={() => zoom(-0.1)}
              />
              <button
                className="zoom-number"
                title="Reset zoom"
                onClick={() => setView({ x: 0, y: 0, z: 1 })}
              >
                {Math.round(view.z * 100)}%
              </button>
              <IconButton
                icon="ZoomIn"
                title="Zoom in"
                onClick={() => zoom(0.1)}
              />
              <i />
              <IconButton icon="Maximize" title="Fit board (F)" onClick={fit} />
            </div>
          </div>
        </BoardStage>
        {properties && !present && (
          <Properties
            board={board}
            selected={selected}
            updateBlock={updateBlock}
            updateEdge={updateEdge}
            onClose={() => setProperties(false)}
            onDelete={removeSelected}
            onDuplicate={() => duplicate(selected)}
            onImport={requestImport}
            onDownload={async (csv) => {
              try {
                await downloadCSV(csv);
              } catch (e) {
                notify(readableError(e));
              }
            }}
            currentView={currentView}
            onUnlock={() => {
              if (viewIsLocked(board, currentView))
                change((b) => ({
                  ...b,
                  views: projectViews(b).map((v) =>
                    v.id === currentView ? { ...v, locked: false } : v,
                  ),
                }));
              else updateBlock(selected, { locked: false });
            }}
            onArrange={(direction) =>
              !blockIsLocked(
                board,
                board.blocks.find((b) => b.id === selected),
                currentView,
              ) &&
              change((b) => {
                const block = b.blocks.find((x) => x.id === selected),
                  others = b.blocks.filter((x) => x.id !== selected);
                return {
                  ...b,
                  blocks:
                    direction === "front"
                      ? [...others, block]
                      : [block, ...others],
                };
              })
            }
          />
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={importFile}
      />
      {uploading && (
        <div className="upload-progress" role="status">
          <Icon name="Loader2" className="spin" /> Uploading CSV to Firebase…
        </div>
      )}
      {modal?.type === "transfer" && (
        <Modal
          title={
            modal.mode === "copy"
              ? "Copy to another view"
              : "Move to another view"
          }
          onClose={() => setModal(null)}
        >
          <p>Contained blocks in a section or Tabs block are included.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (viewIsLocked(boardRef.current, modal.targetViewId)) {
                notify("Unlock the destination view first.");
                return;
              }
              const source = boardRef.current.blocks.find(
                (b) => b.id === modal.blockId,
              );
              if (
                modal.mode === "move" &&
                blockIsLocked(boardRef.current, source, currentView)
              ) {
                notify("Unlock this block before moving it.");
                return;
              }
              change((b) =>
                transferToView(
                  b,
                  modal.blockId,
                  modal.targetViewId,
                  modal.mode,
                ),
              );
              setActiveViewId(modal.targetViewId);
              setModal(null);
              notify(
                modal.mode === "copy"
                  ? "Copied to the selected view."
                  : "Moved to the selected view.",
              );
            }}
          >
            <Field label="Destination view">
              <select
                value={modal.targetViewId}
                onChange={(e) =>
                  setModal((m) => ({ ...m, targetViewId: e.target.value }))
                }
              >
                {projectViews(board)
                  .filter((v) => v.id !== currentView)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.locked ? " (locked)" : ""}
                    </option>
                  ))}
              </select>
            </Field>
            <button className="btn primary full">
              {modal.mode === "copy" ? "Copy to view" : "Move to view"}
            </button>
          </form>
        </Modal>
      )}
      {modal?.type === "leave" && (
        <Modal
          title="Your cloud save needs attention."
          onClose={() => setModal(null)}
        >
          <p>
            Your changes could not be saved to Firebase. A recovery draft is
            kept in this browser for this account and project.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(null)}>
              Keep editing
            </button>
            <button className="btn primary" onClick={() => modal.action()}>
              Leave with browser draft
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === "group" && (
        <Modal
          title={modal.group ? "Rename group" : "Organize your layers"}
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!groupName.trim()) return;
              change((b) => ({
                ...b,
                groups: modal.group
                  ? b.groups.map((g) =>
                      g.id === modal.group.id
                        ? { ...g, name: groupName.trim() }
                        : g,
                    )
                  : [...b.groups, { id: uid(), name: groupName.trim() }],
              }));
              setModal(null);
            }}
          >
            <Field
              label="Group name"
              hint="Assign blocks to this group in their Properties panel."
            >
              <input
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                maxLength={80}
              />
            </Field>
            <button className="btn primary full">
              {modal.group ? "Save group" : "Create group"}
            </button>
          </form>
        </Modal>
      )}
      {modal?.type === "publish" && (
        <Modal
          title="Share the bigger picture."
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <div className="publish-illustration">
            <Icon name="Globe" size={38} />
          </div>
          <p>
            Publish a read-only snapshot of this board. Visitors can switch
            tabs, explore reports, and follow links. Your working project stays
            private.
          </p>
          <div className="publish-note">
            <Icon name="Lock" size={16} />
            <span>
              Only board content is shared. Source CSV files and your account
              details are excluded.
            </span>
          </div>
          {publicationId && (
            <>
              <Field label="Published URL">
                <div className="copy-field">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.target.select()}
                  />
                  <IconButton
                    icon="Copy"
                    title="Copy presentation URL"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        notify("Presentation URL copied.");
                      } catch {
                        notify("Select and copy the URL above.");
                      }
                    }}
                  />
                </div>
              </Field>
              <a
                className="btn full"
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="ExternalLink" size={16} /> Open presentation in new
                tab
              </a>
              <p className="property-hint">
                Changes appear at this URL after you republish. Anyone with
                access to this website and the link can view it.
              </p>
            </>
          )}
          <div className="modal-actions">
            {publicationId && (
              <button
                className="btn danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await unpublishProject(user.uid, id, publicationId);
                    setPublicationId(null);
                    notify(
                      "Presentation unpublished. The link no longer opens the board.",
                    );
                  } catch (e) {
                    notify(readableError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Unpublish
              </button>
            )}
            <button
              className="btn primary"
              disabled={busy || !board.blocks.length}
              onClick={publish}
            >
              {busy ? (
                <Icon name="Loader2" className="spin" size={16} />
              ) : (
                <Icon name="Globe" size={16} />
              )}{" "}
              {publicationId ? "Republish snapshot" : "Publish board"}
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === "help" && (
        <Modal
          title="A little guide to your canvas."
          onClose={() => setModal(null)}
        >
          <ul className="help-list">
            <li>
              Use the bottom toolbar to add text, tables, tabs, link buttons,
              and reports.
            </li>
            <li>
              Drag block headers to move blocks. Drag the bottom-right corner to
              resize.
            </li>
            <li>Select a block to adjust its style in Properties.</li>
            <li>
              Select words inside a text block to format them or add a
              hyperlink.
            </li>
            <li>
              Import a CSV from a table. Values and column names are editable
              directly on the board.
            </li>
            <li>
              Link a Report to a table and choose its columns in Properties.
            </li>
            <li>
              Use Connect, then select two blocks. Select a connector to style
              it.
            </li>
            <li>
              Use layer groups to organize blocks. Double click a group to
              rename it.
            </li>
            <li>
              Publish creates a read-only URL. Live mode is private and only allows adding table rows.
            </li>
          </ul>
          <p className="muted">
            V select · H move · T text · C connect · F fit · Ctrl/⌘ Z undo ·
            Ctrl/⌘ D duplicate · Ctrl/⌘ S save
          </p>
          <button className="btn primary full" onClick={() => setModal(null)}>
            Make some space
          </button>
        </Modal>
      )}
    </div>
  );
}
function Tool({ icon, title, active, onClick }) {
  return (
    <button
      className={active ? "active" : ""}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
