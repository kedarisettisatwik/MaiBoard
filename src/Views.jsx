import React, { useState } from "react";
import { IconButton, Modal, Field } from "./ui";
import { uid, projectViews, copyView } from "./model";
import { presentationTabs } from "./model";
export function PresentationTabs({ board, current, onSelect }) {
  const tabs = presentationTabs(board),vertical=board.viewNavigationLayout==='vertical';
  if (board.showViewNavigation!==true || tabs.length < 2) return null;
  return (
    <nav className={`presentation-tabs ${vertical?'vertical':'horizontal'}`} aria-label="Presentation views">
      <div role="tablist" aria-orientation={vertical?'vertical':'horizontal'}>
        {tabs.map((t) => (
          <button
            role="tab"
            key={t.id}
            aria-selected={t.viewId === current}
            tabIndex={t.viewId===current?0:-1}
            onKeyDown={e=>{const nextKey=vertical?'ArrowDown':'ArrowRight',previousKey=vertical?'ArrowUp':'ArrowLeft';if(![nextKey,previousKey,'Home','End'].includes(e.key))return;e.preventDefault();const index=tabs.findIndex(tab=>tab.id===t.id),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key===nextKey?1:-1)+tabs.length)%tabs.length;onSelect(tabs[next].viewId);e.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();}}
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
    [name, setName] = useState(""),
    [newViewSource, setNewViewSource] = useState(""),[navigationSettings,setNavigationSettings]=useState(false);
  const views = projectViews(board),
    locked = !!views.find((v) => v.id === current)?.locked;
  return (
    <div className="view-controls">
      <IconButton icon="Settings2" title="View navigation settings" onClick={()=>setNavigationSettings(true)}/>
      {navigationSettings&&<Modal title="Project view navigation" onClose={()=>setNavigationSettings(false)}><label className="view-navigation-option"><input type="checkbox" checked={board.showViewNavigation===true} onChange={e=>change(b=>({...b,showViewNavigation:e.target.checked}))}/> Show view navigation</label>{board.showViewNavigation===true&&<Field label="View tabs layout"><select value={board.viewNavigationLayout==='vertical'?'vertical':'horizontal'} onChange={e=>change(b=>({...b,viewNavigationLayout:e.target.value}))}><option value="horizontal">Horizontal — top</option><option value="vertical">Vertical — left</option></select></Field>}<p>Choose top tabs or a left sidebar for Live and Publish. Navigation stays hidden when this option is off; your own navigation buttons and tabs inside blocks remain available.</p><button className="btn primary" onClick={()=>setNavigationSettings(false)}>Done</button></Modal>}
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
        icon={locked ? "Lock" : "Unlock"}
        title={locked ? "Unlock current view" : "Lock current view"}
        active={locked}
        onClick={() =>
          change((b) => ({
            ...b,
            views: projectViews(b).map((v) =>
              v.id === current ? { ...v, locked: !locked } : v,
            ),
          }))
        }
      />
      <IconButton
        icon="Plus"
        title="Add view"
        onClick={() => {
          setName(`View ${views.length + 1}`);
          setNewViewSource("");
          setEditing("new");
        }}
      />
      <IconButton
        icon="Settings2"
        title="Rename view"
        disabled={locked}
        onClick={() => {
          setName(views.find((v) => v.id === current)?.name || "");
          setEditing(current);
        }}
      />
      <IconButton
        icon="Trash2"
        title="Delete view and move blocks to another view"
        disabled={views.length < 2 || locked}
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
              change((b) =>
                editing === "new" && newViewSource
                  ? copyView(b, newViewSource, { id, name: name.trim() })
                  : {
                      ...b,
                      views:
                        editing === "new"
                          ? [...projectViews(b), { id, name: name.trim() }]
                          : projectViews(b).map((v) =>
                              v.id === id ? { ...v, name: name.trim() } : v,
                            ),
                    },
              );
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
            {editing === "new" && (
              <Field label="New view content">
                <select
                  value={newViewSource}
                  onChange={(e) => setNewViewSource(e.target.value)}
                >
                  <option value="">Start with a blank view</option>
                  {views.map((v) => (
                    <option key={v.id} value={v.id}>
                      Copy {v.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <button className="btn primary full">Save view</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
