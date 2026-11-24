import { ExtraProperties } from "./ExtendedBlocks";
import React, { useState } from "react";
import { Icon, IconButton, Field, typeIcons } from "./ui";
import {
  defaultStyle,
  fonts,
  uid,
  deleteColumn,
  safeUrl,
  projectViews,
} from "./model";
const colorPresets = [
  "#ffffff",
  "#e9edf5",
  "#d4e0f7",
  "#e8f0f5",
  "#f2eaf1",
  "#e0e5f0",
];
export default function Properties({
  board,
  selected,
  updateBlock,
  updateEdge,
  onDelete,
  onDuplicate,
  onImport,
  onDownload,
  onClose,
  onArrange,
}) {
  const block = board.blocks.find((b) => b.id === selected),
    edge = board.edges.find((e) => e.id === selected),
    [column, setColumn] = useState("");
  if (!block && !edge)
    return (
      <aside className="properties-panel">
        <div className="panel-heading">
          <h2>Properties</h2>
          <IconButton
            icon="PanelRightClose"
            title="Hide properties"
            onClick={onClose}
          />
        </div>
        <div className="properties-empty">
          <div>
            <Icon name="MousePointer2" size={28} />
          </div>
          <h3>Make it yours.</h3>
          <p>Select a block or a connector to change its properties.</p>
        </div>
        <div className="keyboard-guide">
          <span>Canvas shortcuts</span>
          <p>
            <kbd>V</kbd> Select <kbd>H</kbd> Move
          </p>
          <p>
            <kbd>T</kbd> Text <kbd>C</kbd> Connect
          </p>
          <p>
            <kbd>⌘ / Ctrl Z</kbd> Undo
          </p>
        </div>
      </aside>
    );
  const update = (patch, key = "properties") =>
      block
        ? updateBlock(block.id, patch, key)
        : updateEdge(edge.id, patch, key),
    s = { ...defaultStyle, ...block?.style };
  const style = (patch, key) => update({ style: { ...s, ...patch } }, key);
  const number = (label, value, change, min = 0, max = 2000, step = 1) => (
    <Field label={label}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          if (e.target.value !== "")
            change(Math.min(max, Math.max(min, +e.target.value)));
        }}
      />
    </Field>
  );
  return (
    <aside className="properties-panel">
      <div className="panel-heading">
        <h2>Properties</h2>
        <IconButton
          icon="PanelRightClose"
          title="Hide properties"
          onClick={onClose}
        />
      </div>
      <div className="selection-label">
        <Icon name={block ? typeIcons[block.type] : "MoveUpRight"} size={16} />
        <span>
          {block
            ? `${block.type[0].toUpperCase() + block.type.slice(1)} block`
            : "Connector"}
        </span>
        <span className="selection-dot" />
      </div>
      <div className="properties-scroll">
        {block ? (
          <>
            <section className="property-section">
              <Field label="Block name">
                <input
                  value={block.name}
                  onChange={(e) =>
                    update({ name: e.target.value }, "block-name")
                  }
                />
              </Field>
              <div className="field-pair">
                {number(
                  "Width",
                  block.w,
                  (w) => update({ w }, "width"),
                  260,
                  2400,
                )}
                {number(
                  "Height",
                  block.h || 260,
                  (h) => update({ h }, "height"),
                  160,
                  2400,
                )}
              </div>
              <div className="field-pair">
                {number("X", block.x, (x) => update({ x }, "x"), 0, 12000)}
                {number("Y", block.y, (y) => update({ y }, "y"), 0, 8000)}
              </div>
              <Field label="Layer group">
                <select
                  value={block.groupId || ""}
                  onChange={(e) => update({ groupId: e.target.value })}
                >
                  <option value="">No group</option>
                  {board.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
            </section>
            <ExtraProperties board={board} block={block} update={update} />
            <section className="property-section">
              <h3>Appearance</h3>
              <Field label="Background">
                <div className="color-field">
                  <input
                    type="color"
                    aria-label="Background color"
                    value={s.background}
                    onChange={(e) =>
                      style({ background: e.target.value }, "background")
                    }
                  />
                  <span>{s.background.toUpperCase()}</span>
                </div>
              </Field>
              <div className="color-swatches">
                {colorPresets.map((c) => (
                  <button
                    key={c}
                    style={{ background: c }}
                    className={s.background === c ? "chosen" : ""}
                    title={`Background ${c}`}
                    aria-label={`Background ${c}`}
                    onClick={() => style({ background: c })}
                  />
                ))}
              </div>
              <div className="field-pair">
                {number(
                  "Corner radius",
                  s.radius,
                  (radius) => style({ radius }, "radius"),
                  0,
                  100,
                )}
                {number(
                  "Border width",
                  s.borderWidth,
                  (borderWidth) => style({ borderWidth }, "border-width"),
                  0,
                  12,
                )}
              </div>
              <Field label="Border color">
                <div className="color-field">
                  <input
                    type="color"
                    aria-label="Border color"
                    value={s.borderColor}
                    onChange={(e) =>
                      style({ borderColor: e.target.value }, "border-color")
                    }
                  />
                  <span>{s.borderColor.toUpperCase()}</span>
                </div>
              </Field>
              <div className="field-pair">
                {number(
                  "Padding",
                  s.padding,
                  (padding) => style({ padding }, "padding"),
                  0,
                  80,
                )}
                {number(
                  "Opacity",
                  Math.round(s.opacity * 100),
                  (v) => style({ opacity: v / 100 }, "opacity"),
                  10,
                  100,
                )}
              </div>
            </section>
            {["text", "tabs", "button"].includes(block.type) && (
              <section className="property-section">
                <h3>Typography</h3>
                <Field label="Block font">
                  <select
                    value={s.fontFamily}
                    onChange={(e) => style({ fontFamily: e.target.value })}
                  >
                    {fonts.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Text color">
                  <div className="color-field">
                    <input
                      type="color"
                      aria-label="Text color"
                      value={s.color}
                      onChange={(e) =>
                        style({ color: e.target.value }, "text-color")
                      }
                    />
                    <span>{s.color.toUpperCase()}</span>
                  </div>
                </Field>
                {number(
                  "Font size",
                  s.fontSize,
                  (fontSize) => style({ fontSize }, "font-size"),
                  10,
                  80,
                )}
                {block.type !== "button" && (
                  <p className="property-hint">
                    Select words inside the block to apply bold, underline,
                    highlights, fonts, or a hyperlink.
                  </p>
                )}
              </section>
            )}
            {block.type === "button" && (
              <section className="property-section">
                <h3>Button link</h3>
                <Field label="Button label">
                  <input
                    value={block.link.label}
                    onChange={(e) =>
                      update(
                        { link: { ...block.link, label: e.target.value } },
                        "button-label",
                      )
                    }
                  />
                </Field>
                <Field label="Destination URL">
                  <input
                    value={block.link.url}
                    placeholder="https://example.com"
                    onChange={(e) =>
                      update(
                        { link: { ...block.link, url: e.target.value } },
                        "button-url",
                      )
                    }
                  />
                </Field>
                {block.link.url && !safeUrl(block.link.url) && (
                  <p className="inline-error">
                    Use https://, http://, mailto:, or tel:.
                  </p>
                )}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={block.link.newTab}
                    onChange={(e) =>
                      update({
                        link: { ...block.link, newTab: e.target.checked },
                      })
                    }
                  />{" "}
                  Open in a new tab
                </label>
              </section>
            )}
            {block.type === "table" && (
              <section className="property-section">
                <h3>Table data</h3>
                <p className="property-hint">
                  Click any value or column name on the board to edit it.
                </p>
                <div className="property-buttons">
                  <button
                    className="btn"
                    onClick={() =>
                      update(
                        {
                          table: {
                            ...block.table,
                            rows: [
                              ...block.table.rows,
                              block.table.columns.map(() => ""),
                            ],
                          },
                        },
                        "add-row",
                      )
                    }
                  >
                    <Icon name="Plus" size={15} /> Add row
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      update(
                        {
                          table: {
                            columns: [
                              ...block.table.columns,
                              {
                                id: uid(),
                                name: `Column ${block.table.columns.length + 1}`,
                              },
                            ],
                            rows: block.table.rows.map((r) => [...r, ""]),
                          },
                        },
                        "add-column",
                      )
                    }
                  >
                    <Icon name="Plus" size={15} /> Add column
                  </button>
                </div>
                <Field label="Delete a column">
                  <select
                    value={column}
                    onChange={(e) => setColumn(e.target.value)}
                  >
                    <option value="">Select a column</option>
                    {block.table.columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  className="btn danger subtle"
                  disabled={!column || block.table.columns.length <= 1}
                  onClick={() => {
                    update(
                      { table: deleteColumn(block.table, column) },
                      "delete-column",
                    );
                    setColumn("");
                  }}
                >
                  <Icon name="Trash2" size={15} /> Delete column
                </button>
                <button className="btn full" onClick={() => onImport(block.id)}>
                  <Icon name="Upload" size={15} />{" "}
                  {block.csv ? "Replace CSV data" : "Import CSV"}
                </button>
                {block.csv && (
                  <>
                    <p className="property-hint">
                      Imported from {block.csv.name}. Reimporting replaces all
                      rows and columns.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => onDownload(block.csv)}
                    >
                      <Icon name="Download" size={14} /> Download source CSV
                    </button>
                  </>
                )}
              </section>
            )}
            {block.type === "tabs" && (
              <section className="property-section">
                <h3>Tabs</h3>
                {block.tabs.map((t) => (
                  <div className="tab-property" key={t.id}>
                    <input
                      aria-label="Tab name"
                      value={t.name}
                      onChange={(e) =>
                        update(
                          {
                            tabs: block.tabs.map((x) =>
                              x.id === t.id
                                ? { ...x, name: e.target.value }
                                : x,
                            ),
                          },
                          "tab-name",
                        )
                      }
                    />
                    <IconButton
                      icon="Trash2"
                      title={`Delete ${t.name} tab`}
                      disabled={block.tabs.length < 2}
                      onClick={() => {
                        const tabs = block.tabs.filter((x) => x.id !== t.id);
                        update(
                          {
                            tabs,
                            activeTab: tabs.some(
                              (x) => x.id === block.activeTab,
                            )
                              ? block.activeTab
                              : tabs[0].id,
                          },
                          "delete-tab",
                        );
                      }}
                    />
                    <select
                      aria-label={`View for tab ${t.name}`}
                      value={
                        t.viewId ||
                        (t.contentType === "blocks" ? "__blocks" : "")
                      }
                      onChange={(e) =>
                        update(
                          {
                            tabs: block.tabs.map((x) =>
                              x.id === t.id
                                ? {
                                    ...x,
                                    viewId:
                                      e.target.value === "__blocks"
                                        ? ""
                                        : e.target.value,
                                    contentType:
                                      e.target.value === "__blocks"
                                        ? "blocks"
                                        : e.target.value
                                          ? "view"
                                          : "text",
                                  }
                                : x,
                            ),
                          },
                          "tab-view",
                        )
                      }
                    >
                      <option value="">Local text content</option>
                      <option value="__blocks">Multiple canvas blocks</option>
                      {projectViews(board).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <button
                  className="btn full"
                  onClick={() => {
                    const t = {
                      id: uid(),
                      name: `Tab ${block.tabs.length + 1}`,
                      html: "<p>A new perspective.</p>",
                    };
                    update(
                      { tabs: [...block.tabs, t], activeTab: t.id },
                      "add-tab",
                    );
                  }}
                >
                  <Icon name="Plus" size={15} /> Add tab
                </button>
              </section>
            )}
            {block.type === "report" && (
              <section className="property-section">
                <h3>Report data</h3>
                <Field label="Report source">
                  <select
                    value={
                      block.report.sourceType === "kanban"
                        ? "kanban:" + block.report.kanbanId
                        : block.report.tableId
                    }
                    onChange={(e) => {
                      if (e.target.value.startsWith("kanban:")) {
                        update({
                          report: {
                            ...block.report,
                            sourceType: "kanban",
                            kanbanId: e.target.value.slice(7),
                            kind:
                              block.report.kind === "histogram"
                                ? "pie"
                                : block.report.kind,
                          },
                        });
                        return;
                      }
                      const t = board.blocks.find(
                        (b) => b.id === e.target.value,
                      );
                      update({
                        report: {
                          ...block.report,
                          sourceType: "table",
                          tableId: e.target.value,
                          labelColumn: t?.table.columns[0]?.id || "",
                          valueColumn:
                            t?.table.columns[1]?.id ||
                            t?.table.columns[0]?.id ||
                            "",
                        },
                      });
                    }}
                  >
                    <option value="">Choose a table or K board</option>
                    {board.blocks
                      .filter((b) => b.type === "kanban")
                      .map((b) => (
                        <option key={b.id} value={"kanban:" + b.id}>
                          K board: {b.name}
                        </option>
                      ))}
                    {board.blocks
                      .filter((b) => b.type === "table")
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Chart type">
                  <select
                    value={block.report.kind}
                    onChange={(e) =>
                      update({
                        report: { ...block.report, kind: e.target.value },
                      })
                    }
                  >
                    <option value="pie">Pie chart</option>
                    <option value="bar">Bar chart</option>
                    {block.report.sourceType !== "kanban" && (
                      <option value="histogram">Histogram</option>
                    )}
                  </select>
                </Field>
                {block.report.sourceType !== "kanban" &&
                  block.report.kind !== "histogram" && (
                    <Field label="Label column">
                      <select
                        value={block.report.labelColumn}
                        onChange={(e) =>
                          update({
                            report: {
                              ...block.report,
                              labelColumn: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Select column</option>
                        {board.blocks
                          .find((b) => b.id === block.report.tableId)
                          ?.table.columns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}
                {block.report.sourceType !== "kanban" && (
                  <Field
                    label={
                      block.report.kind === "histogram"
                        ? "Numeric column"
                        : "Value column"
                    }
                  >
                    <select
                      value={block.report.valueColumn}
                      onChange={(e) =>
                        update({
                          report: {
                            ...block.report,
                            valueColumn: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="">Select column</option>
                      {board.blocks
                        .find((b) => b.id === block.report.tableId)
                        ?.table.columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                )}
                {block.report.kind === "histogram" &&
                  number(
                    "Number of bins",
                    block.report.bins,
                    (v) => update({ report: { ...block.report, bins: v } }),
                    2,
                    20,
                  )}
                <p className="property-hint">
                  This report stays connected to its source. Edits to the data
                  appear here automatically.
                </p>
              </section>
            )}
            <section className="property-section">
              <h3>Arrange</h3>
              <div className="property-buttons">
                <button className="btn" onClick={() => onArrange("front")}>
                  Bring to front
                </button>
                <button className="btn" onClick={() => onArrange("back")}>
                  Send to back
                </button>
              </div>
            </section>
            <div className="property-actions">
              <button className="btn" onClick={onDuplicate}>
                <Icon name="Copy" size={16} /> Duplicate
              </button>
              <button className="btn danger" onClick={onDelete}>
                <Icon name="Trash2" size={16} /> Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <section className="property-section">
              <h3>Connector</h3>
              <Field label="From block">
                <select
                  value={edge.from}
                  onChange={(e) => update({ from: e.target.value })}
                >
                  {board.blocks
                    .filter((b) => b.id !== edge.to)
                    .map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="To block">
                <select
                  value={edge.to}
                  onChange={(e) => update({ to: e.target.value })}
                >
                  {board.blocks
                    .filter((b) => b.id !== edge.from)
                    .map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Line style">
                <select
                  value={edge.dash}
                  onChange={(e) => update({ dash: e.target.value })}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </Field>
              <Field label="Line color">
                <input
                  type="color"
                  value={edge.color}
                  onChange={(e) =>
                    update({ color: e.target.value }, "edge-color")
                  }
                />
              </Field>
              {number(
                "Thickness",
                edge.width,
                (v) => update({ width: v }, "edge-width"),
                1,
                10,
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={edge.startArrow}
                  onChange={(e) => update({ startArrow: e.target.checked })}
                />{" "}
                Start arrowhead
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={edge.endArrow}
                  onChange={(e) => update({ endArrow: e.target.checked })}
                />{" "}
                End arrowhead
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={edge.curve !== false}
                  onChange={(e) => update({ curve: e.target.checked })}
                />{" "}
                Curved line
              </label>
            </section>
            <button className="btn danger full" onClick={onDelete}>
              <Icon name="Trash2" size={15} /> Delete connector
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
