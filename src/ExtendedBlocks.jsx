import React, { useRef, useState } from "react";
import { Icon, IconButton, Modal, Field, ErrorMessage } from "./ui";
import RichText, { SafeHTML } from "./RichText";
import { uid, safeImageUrl, moveCard, projectViews } from "./model";

export function TabsBlock({
  block,
  readOnly,
  update,
  active,
  onEditor,
  padding,
  onNavigate,
  runtimeTab,
  onTabNavigate,
  onAddToTab,
  renderCanvas,
}) {
  const [viewTab, setViewTab] = useState(block.activeTab),
    [open, setOpen] = useState({});
  const selected = readOnly ? runtimeTab || block.tabs[0].id : block.activeTab,
    layout = block.tabLayout || "horizontal",
    highlight = block.tabHighlight || "underline";
  const content = (t) => (
    <>
      {t.viewId ? (
        renderCanvas?.(t, t.viewId)
      ) : t.contentType === "blocks" || block.childrenMode ? (
        renderCanvas?.(t)
      ) : readOnly ? (
        <SafeHTML html={t.html} />
      ) : (
        <RichText
          key={t.id}
          value={t.html}
          active={active}
          onEditor={onEditor}
          onChange={(html) =>
            update(
              {
                tabs: block.tabs.map((x) =>
                  x.id === t.id ? { ...x, html } : x,
                ),
              },
              "rich-text",
            )
          }
        />
      )}
    </>
  );
  return (
    <div
      className={`tabs-layout ${layout} highlight-${highlight}`}
      style={{
        "--tab-accent": block.tabAccent || "#2563eb",
        "--tab-active-text": block.tabTextColor || "#ffffff",
      }}
    >
      {layout === "accordion" ? (
        <div className="accordion-list">
          {block.tabs.map((t) => (
            <div
              className={`accordion-item ${open[t.id] ? "expanded" : ""}`}
              key={t.id}
            >
              <button
                className="accordion-title"
                aria-expanded={!!open[t.id]}
                onClick={() => setOpen((s) => ({ ...s, [t.id]: !s[t.id] }))}
              >
                <span>{t.name}</span>
                <Icon
                  name={open[t.id] ? "ChevronDown" : "ChevronRight"}
                  size={16}
                />
              </button>
              {open[t.id] && (
                <div className="block-content" style={{ padding }}>
                  {content(t)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div
            className="block-tabs"
            role="tablist"
            aria-orientation={layout === "vertical" ? "vertical" : "horizontal"}
          >
            {block.tabs.map((t) => (
              <button
                role="tab"
                aria-selected={selected === t.id}
                className={selected === t.id ? "active" : ""}
                key={t.id}
                onClick={() =>
                  readOnly
                    ? onTabNavigate?.(block.id, t.id)
                    : update({ activeTab: t.id }, "tab-switch")
                }
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="block-content" role="tabpanel" style={{ padding }}>
            {content(
              block.tabs.find((t) => t.id === selected) || block.tabs[0],
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ImageBlock({ block, readOnly, update, onUpload }) {
  const [fileError, setFileError] = useState(""),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false),
    input = useRef();
  const src = safeImageUrl(block.image?.src || "");
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setFileError("");
    try {
      const image = await onUpload(file);
      update({ image: { ...block.image, ...image } }, "image-upload");
      setFailed(false);
    } catch (e) {
      setFileError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="image-block-inner">
      {src && !failed ? (
        <img
          src={src}
          alt={block.image.alt || block.name}
          style={{ objectFit: block.image.fit || "contain" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="image-placeholder">
          <Icon name="Image" size={32} />
          <p>
            {failed
              ? "This image could not be loaded."
              : "Bring an image into the picture."}
          </p>
        </div>
      )}
      {!readOnly && (
        <div className="image-editor">
          <input
            aria-label="Image URL"
            placeholder="Paste an https:// image URL"
            value={block.image.src.startsWith("data:") ? "" : block.image.src}
            onChange={(e) => {
              update(
                { image: { ...block.image, src: e.target.value } },
                "image-url",
              );
              setFailed(false);
            }}
          />
          <button
            className="btn"
            disabled={busy}
            onClick={() => input.current.click()}
          >
            <Icon name={busy ? "Loader2" : "Upload"} size={15} /> Upload image
          </button>
          <input
            ref={input}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={upload}
          />
          <ErrorMessage>{fileError}</ErrorMessage>
        </div>
      )}
    </div>
  );
}

export function KanbanBlock({ block, readOnly, update }) {
  const [editing, setEditing] = useState(null);
  const data = block.kanban;
  const saveColumn = (id, name) =>
    update(
      {
        kanban: {
          ...data,
          columns: data.columns.map((c) => (c.id === id ? { ...c, name } : c)),
        },
      },
      "kanban-column",
    );
  return (
    <div className="kanban" onPointerDown={(e) => e.stopPropagation()}>
      <div className="kanban-columns">
        {data.columns.map((column) => {
          const cards = data.cards.filter((c) => c.columnId === column.id);
          return (
            <section
              key={column.id}
              className="kanban-column"
              onDragOver={(e) => {
                if (!readOnly) e.preventDefault();
              }}
              onDrop={(e) => {
                if (readOnly) return;
                e.preventDefault();
                try {
                  const transfer = JSON.parse(
                    e.dataTransfer.getData("application/maiboard-card"),
                  );
                  if (transfer.blockId === block.id)
                    update(
                      { kanban: moveCard(data, transfer.cardId, column.id) },
                      "move-card",
                    );
                } catch {}
              }}
            >
              <header className="kanban-column-header">
                {readOnly ? (
                  <strong>{column.name}</strong>
                ) : (
                  <input
                    aria-label={`Column name ${column.name}`}
                    value={column.name}
                    onChange={(e) => saveColumn(column.id, e.target.value)}
                  />
                )}
                <span
                  className="kanban-count"
                  aria-label={`${column.name}: ${cards.length} items`}
                >
                  {cards.length}
                </span>
                {!readOnly && (
                  <>
                    <IconButton
                      icon="Plus"
                      title={`Add item to ${column.name}`}
                      onClick={() =>
                        setEditing({
                          id: uid(),
                          columnId: column.id,
                          title: "",
                          description: "",
                          isNew: true,
                        })
                      }
                    />
                    <IconButton
                      icon="Trash2"
                      title={`Delete ${column.name} column and move its cards`}
                      disabled={data.columns.length <= 1}
                      onClick={() => {
                        const next = data.columns.filter(
                          (c) => c.id !== column.id,
                        );
                        update(
                          {
                            kanban: {
                              columns: next,
                              cards: data.cards.map((c) =>
                                c.columnId === column.id
                                  ? { ...c, columnId: next[0].id }
                                  : c,
                              ),
                            },
                          },
                          "delete-kanban-column",
                        );
                      }}
                    />
                  </>
                )}
              </header>
              <div className="kanban-cards">
                {cards.map((card) => (
                  <article
                    key={card.id}
                    className="kanban-card"
                    draggable={!readOnly}
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "application/maiboard-card",
                        JSON.stringify({ blockId: block.id, cardId: card.id }),
                      )
                    }
                  >
                    <strong>{card.title}</strong>
                    {card.description && <p>{card.description}</p>}
                    {!readOnly && (
                      <div className="card-actions">
                        <button onClick={() => setEditing({ ...card })}>
                          Edit / move
                        </button>
                        <IconButton
                          icon="Trash2"
                          title={`Delete card ${card.title}`}
                          onClick={() =>
                            update(
                              {
                                kanban: {
                                  ...data,
                                  cards: data.cards.filter(
                                    (c) => c.id !== card.id,
                                  ),
                                },
                              },
                              "delete-card",
                            )
                          }
                        />
                      </div>
                    )}
                  </article>
                ))}
                {!cards.length && (
                  <span className="kanban-empty">
                    {readOnly ? "No items" : "Drop a card here"}
                  </span>
                )}
              </div>
              {!readOnly && (
                <button
                  className="kanban-add"
                  onClick={() =>
                    setEditing({
                      id: uid(),
                      columnId: column.id,
                      title: "",
                      description: "",
                      isNew: true,
                    })
                  }
                >
                  <Icon name="Plus" size={15} /> Add item
                </button>
              )}
            </section>
          );
        })}
        {!readOnly && (
          <button
            className="kanban-add-column"
            onClick={() =>
              update(
                {
                  kanban: {
                    ...data,
                    columns: [
                      ...data.columns,
                      { id: uid(), name: `Column ${data.columns.length + 1}` },
                    ],
                  },
                },
                "add-kanban-column",
              )
            }
          >
            <Icon name="Plus" size={17} /> Add column
          </button>
        )}
      </div>
      {editing && (
        <Modal
          title={editing.isNew ? "A new item" : "Edit item"}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const { isNew, ...card } = editing;
              update(
                {
                  kanban: {
                    ...data,
                    cards: isNew
                      ? [...data.cards, card]
                      : data.cards.map((c) => (c.id === card.id ? card : c)),
                  },
                },
                "save-card",
              );
              setEditing(null);
            }}
          >
            <Field label="Item title">
              <input
                required
                maxLength={150}
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                value={editing.description}
                maxLength={2000}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </Field>
            <Field label="Column">
              <select
                value={editing.columnId}
                onChange={(e) =>
                  setEditing({ ...editing, columnId: e.target.value })
                }
              >
                {data.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="btn primary full"
              disabled={!editing.title.trim()}
            >
              Save item
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function ExtraProperties({ board, block, update }) {
  return (
    <section className="property-section">
      <Field label="Visible in view">
        <select
          value={block.viewId || projectViews(board)[0].id}
          onChange={(e) => update({ viewId: e.target.value })}
        >
          {projectViews(board).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
          <option value="*">All views</option>
        </select>
      </Field>
      {block.type === "section" && (
        <p className="property-hint">
          Place blocks inside this rectangle or assign their Parent section
          here. Dragging stays inside the parent. Moving or hiding a section
          includes its blocks. Deleting the section keeps its contents.
        </p>
      )}
      {block.type === "tabs" && (
        <>
          <h3>Tab layout & active state</h3>
          <Field label="Tab layout">
            <select
              value={block.tabLayout || "horizontal"}
              onChange={(e) => update({ tabLayout: e.target.value })}
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical, content on right</option>
              <option value="accordion">Dropdown / accordion</option>
            </select>
          </Field>
          <Field label="Active tab highlight">
            <select
              value={block.tabHighlight || "underline"}
              onChange={(e) => update({ tabHighlight: e.target.value })}
            >
              <option value="underline">Underline</option>
              <option value="filled">Filled background</option>
              <option value="pill">Rounded pill</option>
              <option value="outline">Outline</option>
            </select>
          </Field>
          <Field label="Active tab color">
            <input
              type="color"
              value={block.tabAccent || "#2563eb"}
              onChange={(e) =>
                update({ tabAccent: e.target.value }, "tab-accent")
              }
            />
          </Field>
          <Field label="Active tab text color">
            <input
              type="color"
              value={block.tabTextColor || "#ffffff"}
              onChange={(e) =>
                update({ tabTextColor: e.target.value }, "tab-text")
              }
            />
          </Field>
          <p className="property-hint">
            Accordion sections start closed and expand independently.
          </p>
        </>
      )}
      {block.type === "button" && (
        <>
          <Field label="Button action">
            <select
              value={block.link.action || "url"}
              onChange={(e) =>
                update({
                  link: {
                    ...block.link,
                    action: e.target.value,
                    targetViewId:
                      block.link.targetViewId || projectViews(board)[0].id,
                  },
                })
              }
            >
              <option value="url">Open hyperlink</option>
              <option value="view">Change whole project view</option>
              <option value="tab">Switch a Tabs block tab</option>
              <option value="next">Next project view</option>
            </select>
          </Field>
          {block.link.action === "tab" && (
            <>
              <Field label="Target Tabs block">
                <select
                  value={block.link.targetTabBlockId || ""}
                  onChange={(e) => {
                    const target = board.blocks.find(
                      (b) => b.id === e.target.value,
                    );
                    update({
                      link: {
                        ...block.link,
                        targetTabBlockId: e.target.value,
                        targetTabId: target?.tabs[0]?.id || "",
                      },
                    });
                  }}
                >
                  <option value="">Choose a Tabs block</option>
                  {board.blocks
                    .filter((b) => b.type === "tabs")
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Destination tab">
                <select
                  value={block.link.targetTabId || ""}
                  onChange={(e) =>
                    update({
                      link: { ...block.link, targetTabId: e.target.value },
                    })
                  }
                >
                  <option value="">Choose a tab</option>
                  {board.blocks
                    .find((b) => b.id === block.link.targetTabBlockId)
                    ?.tabs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </Field>
            </>
          )}
          {block.link.action === "view" && (
            <Field label="Destination view">
              <select
                value={block.link.targetViewId || projectViews(board)[0].id}
                onChange={(e) =>
                  update({
                    link: { ...block.link, targetViewId: e.target.value },
                  })
                }
              >
                {projectViews(board).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </>
      )}
      {block.type === "image" && (
        <>
          <Field label="Image description">
            <input
              value={block.image.alt}
              onChange={(e) =>
                update(
                  { image: { ...block.image, alt: e.target.value } },
                  "image-alt",
                )
              }
            />
          </Field>
          <Field label="Image fit">
            <select
              value={block.image.fit}
              onChange={(e) =>
                update({ image: { ...block.image, fit: e.target.value } })
              }
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Stretch</option>
            </select>
          </Field>
        </>
      )}
      {block.type === "kanban" && (
        <p className="property-hint">
          Use + in a column to add an item. Drag cards between columns, or
          choose a destination in Edit / move. Counts update automatically.
        </p>
      )}
    </section>
  );
}
