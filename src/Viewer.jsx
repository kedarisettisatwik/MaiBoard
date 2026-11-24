import React, { useEffect, useRef, useState } from "react";
import { getPublication } from "./firebase";
import { readableError, viewBlocks, projectViews, startingView } from "./model";
import { Logo, Icon, IconButton, Spinner, ErrorMessage } from "./ui";
import { PresentationTabs } from "./Views";
import BoardStage, { blockHeight } from "./BoardStage";
export default function Viewer({ id }) {
  const [board, setBoard] = useState(null),
    [error, setError] = useState(""),
    [view, setView] = useState({ x: 0, y: 0, z: 1 }),
    [publishedAt, setPublishedAt] = useState(null),
    [retry, setRetry] = useState(0),
    [activeView, setActiveView] = useState(null),
    [runtimeTabs, setRuntimeTabs] = useState({}),
    stageRef = useRef();
  useEffect(() => {
    let active = true;
    setError("");
    getPublication(id)
      .then((p) => {
        if (active) {
          setBoard(JSON.parse(p.boardJson));
          setPublishedAt(p.publishedAt?.toDate?.());
        }
      })
      .catch((e) => {
        if (active) setError(readableError(e));
      });
    return () => (active = false);
  }, [id, retry]);
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
          <Icon name="Eye" size={15} /> Read-only presentation
        </span>
      </nav>
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
          stageRef={stageRef}
        >
          <div className="viewer-caption canvas-overlay">
            <Icon name="Lock" size={13} />
            <span>
              Published snapshot
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
  );
}
