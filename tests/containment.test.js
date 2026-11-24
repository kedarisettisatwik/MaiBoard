import test from "node:test";
import assert from "node:assert/strict";
import {
  blankBoard,
  newBlock,
  relocateLayer,
  updateBoardBlock,
  parentBounds,
} from "../src/model.js";
test("A section inside a tab passes its ownership to dropped children and dragging retains it", () => {
  const tabs = newBlock("tabs"),
    section = newBlock("section"),
    text = newBlock("text");
  let board = { ...blankBoard(), blocks: [tabs, section, text] };
  board = relocateLayer(board, section.id, {
    tabParentId: tabs.id,
    tabId: tabs.tabs[0].id,
  });
  board = relocateLayer(board, text.id, { parentId: section.id });
  for (const patch of [
    { x: -999, y: -999 },
    { x: 99999, y: 99999 },
    { x: 50, y: 90 },
  ]) {
    board = updateBoardBlock(board, text.id, patch);
    const child = board.blocks.find((b) => b.id === text.id),
      bounds = parentBounds(board, child);
    assert.equal(child.parentId, section.id);
    assert.equal(child.tabParentId, tabs.id);
    assert.equal(child.tabId, tabs.tabs[0].id);
    assert.ok(child.x >= bounds.x);
    assert.ok(child.y >= bounds.y);
    assert.ok(child.x + child.w <= bounds.x + bounds.w);
    assert.ok(child.y + child.h <= bounds.y + bounds.h);
  }
});
test("Tab children stay within the tab canvas when moved or resized", () => {
  const tabs = newBlock("tabs"),
    text = newBlock("text");
  let b = relocateLayer({ ...blankBoard(), blocks: [tabs, text] }, text.id, {
    tabParentId: tabs.id,
    tabId: tabs.tabs[0].id,
  });
  b = updateBoardBlock(b, text.id, { w: 5000, h: 5000, x: 9000, y: 9000 });
  const child = b.blocks.find((x) => x.id === text.id),
    bounds = parentBounds(b, child);
  assert.ok(child.x + child.w <= bounds.x + bounds.w);
  assert.ok(child.y + child.h <= bounds.y + bounds.h);
  assert.equal(child.tabParentId, tabs.id);
});
test("Changing parent size keeps children inside, while only a layer move changes ownership", () => {
  const section = newBlock("section"),
    text = newBlock("text");
  let b = relocateLayer({ ...blankBoard(), blocks: [section, text] }, text.id, {
    parentId: section.id,
  });
  b = updateBoardBlock(b, section.id, { w: 300, h: 230 });
  const child = b.blocks.find((x) => x.id === text.id),
    bounds = parentBounds(b, child);
  assert.ok(child.w <= bounds.w);
  assert.ok(child.h <= bounds.h);
  assert.equal(child.parentId, section.id);
  b = relocateLayer(b, text.id);
  assert.equal(b.blocks.find((x) => x.id === text.id).parentId, "");
  assert.equal(b.blocks.find((x) => x.id === text.id).tabParentId, "");
});
