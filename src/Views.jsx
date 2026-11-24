import React, { useState } from "react";
import { IconButton, Modal, Field } from "./ui";
import { uid, projectViews } from "./model";
import { presentationTabs } from "./model";
export function PresentationTabs({ board, current, onSelect }) {
  const tabs = presentationTabs(board);
  if (tabs.length < 2) return null;
  return (
    <nav className="presentation-tabs" aria-label="Presentation views">
      <div role="tablist">
        {tabs.map((t) => (
          <button
            role="tab"
            key={t.id}
            aria-selected={t.viewId === current}
            className={t.viewId === current ? "active" : ""}
            onClick={() => onSelect(t.viewId)}
          >
            {t.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
export default function Views({ board, current, onSelect, change }) {
  const [editing, setEditing] = useState(null),
    [name, setName] = useState("");
  const views = projectViews(board);
  return (
    <div className="view-controls">
      <select
        aria-label="Current view"
        value={current}
        onChange={(e) => onSelect(e.target.value)}
      >
        {views.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <IconButton
        icon="Plus"
        title="Add view"
        onClick={() => {
          setName(`View ${views.length + 1}`);
          setEditing("new");
        }}
      />
      <IconButton
        icon="Settings2"
        title="Rename view"
        onClick={() => {
          setName(views.find((v) => v.id === current)?.name || "");
          setEditing(current);
        }}
      />
      <IconButton
        icon="Trash2"
        title="Delete view and move blocks to another view"
        disabled={views.length < 2}
        onClick={() => {
          const remaining = views.filter((v) => v.id !== current),
            next = remaining[0].id;
          change((b) => ({
            ...b,
            views: remaining,
            startViewId: b.startViewId === current ? next : b.startViewId,
            blocks: b.blocks.map((x) => ({
              ...x,
              viewId: (x.viewId || views[0].id) === current ? next : x.viewId,
              ...(x.type === "button" && x.link.targetViewId === current
                ? { link: { ...x.link, targetViewId: next } }
                : {}),
            })),
          }));
          onSelect(next);
        }}
      />
      <label className="start-view-label">
        Start
        <select
          aria-label="Published starting view"
          value={board.startViewId || views[0].id}
          onChange={(e) =>
            change((b) => ({ ...b, startViewId: e.target.value }))
          }
        >
          {views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      {editing && (
        <Modal
          title={editing === "new" ? "Add a view" : "Rename view"}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              const id = editing === "new" ? uid() : editing;
              change((b) => ({
                ...b,
                views:
                  editing === "new"
                    ? [...projectViews(b), { id, name: name.trim() }]
                    : projectViews(b).map((v) =>
                        v.id === id ? { ...v, name: name.trim() } : v,
                      ),
              }));
              onSelect(id);
              setEditing(null);
            }}
          >
            <Field label="View name">
              <input
                required
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <button className="btn primary full">Save view</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
