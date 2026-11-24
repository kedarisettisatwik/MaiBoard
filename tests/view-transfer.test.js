import test from "node:test";
import assert from "node:assert/strict";
import {
  blankBoard,
  newBlock,
  copyView,
  transferToView,
  viewBlocks,
} from "../src/model.js";
test("Copying a view duplicates blocks and internal connections with new IDs", () => {
  const a = newBlock("table"),
    r = newBlock("report");
  r.report.tableId = a.id;
  const board = {
    ...blankBoard(),
    blocks: [a, r],
    edges: [{ id: "e", from: a.id, to: r.id }],
  };
  const copied = copyView(board, "view-1", { id: "second", name: "View 2" });
  assert.equal(copied.views.length, 2);
  const visible = viewBlocks(copied, "second");
  assert.equal(visible.length, 2);
  assert.notEqual(visible[0].id, a.id);
  assert.equal(visible[1].report.tableId, visible[0].id);
  assert.equal(copied.edges[1].from, visible[0].id);
  assert.equal(board.blocks.length, 2);
});
test("Copy to view includes section contents and leaves original objects intact", () => {
  const section = newBlock("section"),
    text = { ...newBlock("text"), parentId: section.id },
    board = {
      ...blankBoard(),
      views: [
        { id: "view-1", name: "View 1" },
        { id: "second", name: "View 2" },
      ],
      blocks: [section, text],
    };
  const copied = transferToView(board, section.id, "second", "copy"),
    newBlocks = viewBlocks(copied, "second");
  assert.equal(newBlocks.length, 2);
  assert.notEqual(newBlocks[0].id, section.id);
  assert.equal(newBlocks[1].parentId, newBlocks[0].id);
  assert.equal(viewBlocks(copied, "view-1").length, 2);
});
test("Move to view preserves IDs and detaches the moved root from its old container", () => {
  const tabs = newBlock("tabs"),
    text = {
      ...newBlock("text"),
      tabParentId: tabs.id,
      tabId: tabs.tabs[0].id,
    },
    board = {
      ...blankBoard(),
      views: [
        { id: "view-1", name: "View 1" },
        { id: "second", name: "View 2" },
      ],
      blocks: [tabs, text],
    };
  const moved = transferToView(board, text.id, "second", "move");
  assert.equal(moved.blocks.length, 2);
  const target = moved.blocks.find((b) => b.id === text.id);
  assert.equal(target.viewId, "second");
  assert.equal(target.tabParentId, "");
  assert.equal(viewBlocks(moved, "second").length, 1);
});
test("Locked destination views reject transfers", () => {
  const text = newBlock("text"),
    board = {
      ...blankBoard(),
      views: [
        { id: "view-1", name: "View 1" },
        { id: "second", name: "View 2", locked: true },
      ],
      blocks: [text],
    };
  assert.equal(transferToView(board, text.id, "second", "copy"), board);
  assert.equal(transferToView(board, text.id, "second", "move"), board);
});
