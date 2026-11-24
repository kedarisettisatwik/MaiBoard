import test from "node:test";
import assert from "node:assert/strict";
import {
  blankBoard,
  newBlock,
  blockIsLocked,
  viewIsLocked,
  canUpdateBlock,
} from "../src/model.js";
test("Block locks reject layout, text and style edits while allowing unlock and visibility", () => {
  const b = newBlock("text");
  b.locked = true;
  const board = { ...blankBoard(), blocks: [b] };
  for (const patch of [
    { x: 20 },
    { w: 500 },
    { html: "changed" },
    { style: { radius: 40 } },
    { name: "changed" },
  ])
    assert.equal(canUpdateBlock(board, b, patch, "view-1"), false);
  assert.ok(canUpdateBlock(board, b, { locked: false }, "view-1"));
  assert.ok(canUpdateBlock(board, b, { hidden: true }, "view-1"));
});
test("Locked tables retain data actions and locked tabs retain switching", () => {
  const table = { ...newBlock("table"), locked: true },
    tabs = { ...newBlock("tabs"), locked: true },
    board = { ...blankBoard(), blocks: [table, tabs] };
  assert.ok(
    canUpdateBlock(
      board,
      table,
      { table: { ...table.table, rows: [...table.table.rows, ["New", "1"]] } },
      "view-1",
    ),
  );
  assert.ok(
    canUpdateBlock(board, tabs, { activeTab: tabs.tabs[1].id }, "view-1"),
  );
  assert.equal(canUpdateBlock(board, tabs, { tabs: [] }, "view-1"), false);
});
test("Section frame locks leave children editable; a view lock protects every block in that view", () => {
  const section = { ...newBlock("section"), locked: true },
    child = { ...newBlock("text"), parentId: section.id },
    table = newBlock("table"),
    board = { ...blankBoard(), blocks: [section, child, table] };
  assert.equal(blockIsLocked(board, child, "view-1"), false);
  board.views[0].locked = true;
  assert.ok(viewIsLocked(board, "view-1"));
  assert.ok(blockIsLocked(board, child, "view-1"));
  assert.equal(
    canUpdateBlock(board, child, { html: "changed" }, "view-1"),
    false,
  );
  assert.ok(canUpdateBlock(board, table, { table: table.table }, "view-1"));
});
