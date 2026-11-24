import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCSV,
  newBlock,
  blankBoard,
  sampleBoard,
  safeUrl,
  deleteColumn,
  deleteBlock,
  duplicateBlock,
  reportData,
  numeric,
  publishSnapshot,
  boardBytes,
} from "../src/model.js";
test("CSV preserves quoted commas, escaped quotes, multiline cells, BOM and empty values", () => {
  const t = parseCSV(
    '\uFEFFChannel,Note,Value\r\n"Organic, search","said ""yes""",12\r\nDirect,"line 1\nline 2",',
  );
  assert.deepEqual(
    t.columns.map((c) => c.name),
    ["Channel", "Note", "Value"],
  );
  assert.deepEqual(t.rows, [
    ["Organic, search", 'said "yes"', "12"],
    ["Direct", "line 1\nline 2", ""],
  ]);
  assert.equal(new Set(t.columns.map((c) => c.id)).size, 3);
});
test("CSV rejects malformed data and excessive rows or columns", () => {
  assert.throws(() => parseCSV('a,b\n"oops'), /could not be read/);
  assert.throws(() => parseCSV(""), /empty/);
  assert.throws(
    () => parseCSV("a\n" + Array(1001).fill("1").join("\n")),
    /1,000/,
  );
  assert.throws(() => parseCSV(Array(51).fill("a").join(",")), /50 columns/);
});
test("Ragged CSV rows get matching column widths and fallback column names", () => {
  const t = parseCSV("Name,\na,1,2\nb");
  assert.deepEqual(
    t.columns.map((c) => c.name),
    ["Name", "Column 2", "Column 3"],
  );
  assert.deepEqual(t.rows, [
    ["a", "1", "2"],
    ["b", "", ""],
  ]);
});
test("Only safe hyperlink protocols are accepted", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.test",
    "not a url",
    "vbscript:abc",
  ])
    assert.equal(safeUrl(value), "");
  for (const value of [
    "https://example.com",
    "http://localhost:5173",
    "mailto:hello@example.com",
    "tel:+12345678",
  ])
    assert.ok(safeUrl(value));
});
test("Deleting a column removes matching values and preserves remaining IDs", () => {
  const t = newBlock("table").table,
    original = structuredClone(t),
    next = deleteColumn(t, t.columns[0].id);
  assert.equal(next.columns.length, 1);
  assert.deepEqual(next.rows, [["120"], ["80"], ["60"]]);
  assert.deepEqual(t, original);
  assert.equal(deleteColumn(next, next.columns[0].id), next);
});
test("Deleting a block removes connections but leaves other data intact", () => {
  const b = sampleBoard(),
    id = b.blocks[1].id,
    next = deleteBlock(b, id);
  assert.equal(next.blocks.length, b.blocks.length - 1);
  assert.ok(next.edges.every((e) => e.from !== id && e.to !== id));
  assert.equal(b.blocks.length, 4);
});
test("Duplicating a block deeply copies its content", () => {
  const b = sampleBoard(),
    next = duplicateBlock(b, b.blocks[1].id),
    copy = next.blocks.at(-1);
  assert.notEqual(copy.id, b.blocks[1].id);
  copy.table.rows[0][0] = "Changed";
  assert.equal(b.blocks[1].table.rows[0][0], "Organic");
  assert.equal(next.edges.length, b.edges.length);
});
test("Numeric values support separators, currencies, percent and signed numbers", () => {
  assert.equal(numeric("₹ 12,480"), 12480);
  assert.equal(numeric("14.9%"), 14.9);
  assert.equal(numeric("-4.2"), -4.2);
  for (const x of ["", null, "hello", "12oops", "NaN", "Infinity"])
    assert.equal(numeric(x), null);
});
test("Pie reports aggregate labels, omit invalid values and update with table edits", () => {
  const t = newBlock("table"),
    r = newBlock("report");
  r.report = {
    ...r.report,
    tableId: t.id,
    labelColumn: t.table.columns[0].id,
    valueColumn: t.table.columns[1].id,
  };
  t.table.rows = [
    ["A", "10"],
    ["A", "5"],
    ["B", "20"],
    ["Bad", "not a number"],
    ["Negative", "-4"],
    ["Zero", "0"],
  ];
  assert.deepEqual(reportData(r, [t]).data, [
    { name: "A", value: 15 },
    { name: "B", value: 20 },
  ]);
  assert.equal(reportData(r, [t]).skipped, 3);
  t.table.rows[0][1] = "30";
  assert.equal(reportData(r, [t]).data[0].value, 35);
});
test("Histogram bins include upper bound and preserve all numeric observations", () => {
  const t = newBlock("table"),
    r = newBlock("report");
  r.report = {
    ...r.report,
    kind: "histogram",
    tableId: t.id,
    valueColumn: t.table.columns[1].id,
    bins: 4,
  };
  t.table.rows = [
    ["A", "0"],
    ["B", "5"],
    ["C", "10"],
    ["D", "20"],
    ["E", "bad"],
  ];
  const result = reportData(r, [t]);
  assert.equal(result.data.length, 4);
  assert.equal(
    result.data.reduce((s, d) => s + d.value, 0),
    4,
  );
  assert.equal(result.data.at(-1).value, 1);
  assert.equal(result.skipped, 1);
  t.table.rows = [
    ["A", "4"],
    ["B", "4"],
  ];
  assert.deepEqual(
    reportData(r, [t]).data.map((d) => d.value),
    [2],
  );
});
test("Missing sources and deleted columns yield actionable report states", () => {
  const r = newBlock("report");
  assert.match(reportData(r, []).reason, /Choose a table/);
  const t = newBlock("table");
  r.report.tableId = t.id;
  assert.match(reportData(r, [t]).reason, /numeric column/);
});
test("Published snapshots exclude source CSV metadata and stay independent of edits", () => {
  const b = sampleBoard();
  b.csvFiles = [{ path: "private/file.csv", name: "private.csv" }];
  b.blocks[1].csv = b.csvFiles[0];
  const snapshot = publishSnapshot(b);
  assert.ok(!("csvFiles" in snapshot));
  assert.ok(!("csv" in snapshot.blocks[1]));
  assert.ok(!JSON.stringify(snapshot).includes("private/file.csv"));
  b.blocks[1].table.rows[0][1] = "999";
  assert.equal(snapshot.blocks[1].table.rows[0][1], "12480");
});
test("Board size counts UTF-8 bytes", () => {
  const a = blankBoard("é");
  assert.ok(boardBytes(a) > JSON.stringify(a).length);
});
