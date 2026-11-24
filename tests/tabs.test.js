import test from "node:test";
import assert from "node:assert/strict";
import {
  newBlock,
  blankBoard,
  duplicateBlock,
  deleteBlock,
  relocateLayer,
  viewBlocks,
  startingView,
  presentationTabs,
} from "../src/model.js";
test("Tabs own multiple independent blocks; moving their view carries their visible content", () => {
  const tabs = newBlock("tabs"),
    text = {
      ...newBlock("text"),
      tabParentId: tabs.id,
      tabId: tabs.tabs[0].id,
    },
    table = {
      ...newBlock("table"),
      tabParentId: tabs.id,
      tabId: tabs.tabs[1].id,
    },
    board = { ...blankBoard(), blocks: [tabs, text, table] };
  tabs.viewId = "second";
  board.views.push({ id: "second", name: "Second" });
  assert.equal(viewBlocks(board, "second").length, 3);
  assert.equal(viewBlocks(board, "view-1").length, 0);
});
test("Duplicating or deleting a Tabs block handles all its contained blocks", () => {
  const tabs = newBlock("tabs"),
    text = {
      ...newBlock("text"),
      tabParentId: tabs.id,
      tabId: tabs.tabs[0].id,
    },
    button = {
      ...newBlock("button"),
      tabParentId: tabs.id,
      tabId: tabs.tabs[0].id,
    };
  button.link.action = "tab";
  button.link.targetTabBlockId = tabs.id;
  button.link.targetTabId = tabs.tabs[1].id;
  const b = { ...blankBoard(), blocks: [tabs, text, button] },
    copy = duplicateBlock(b, tabs.id),
    copyTabs = copy.blocks[3];
  assert.equal(copy.blocks.length, 6);
  assert.equal(copy.blocks[4].tabParentId, copyTabs.id);
  assert.equal(copy.blocks[5].link.targetTabBlockId, copyTabs.id);
  assert.equal(copy.blocks[4].x, text.x);
  assert.equal(deleteBlock(b, tabs.id).blocks.length, 0);
});
test("Layers can put blocks into tabs and pull them back out without cycles", () => {
  const a = newBlock("tabs"),
    b = newBlock("tabs"),
    text = newBlock("text"),
    board = { ...blankBoard(), blocks: [a, b, text] };
  const placed = relocateLayer(board, text.id, {
    tabParentId: a.id,
    tabId: a.tabs[0].id,
  });
  assert.equal(placed.blocks.find((x) => x.id === text.id).tabParentId, a.id);
  assert.equal(
    placed.blocks.find((x) => x.id === a.id).tabs[0].contentType,
    "blocks",
  );
  const nested = relocateLayer(board, b.id, {
    tabParentId: a.id,
    tabId: a.tabs[0].id,
  });
  assert.equal(
    relocateLayer(nested, a.id, { tabParentId: b.id, tabId: b.tabs[0].id }),
    nested,
  );
  assert.equal(relocateLayer(placed, text.id).blocks.at(-1).tabParentId, "");
});
test("Whole-view navigation stays separate from local tab bindings", () => {
  const board = blankBoard(),
    tabs = newBlock("tabs");
  board.views.push({ id: "two", name: "Second view" });
  tabs.tabs[0].viewId = "two";
  board.blocks = [tabs];
  assert.equal(startingView(board), "view-1");
  assert.deepEqual(
    presentationTabs(board).map((t) => t.viewId),
    ["view-1", "two"],
  );
});
