import test from "node:test";
import assert from "node:assert/strict";
import {
  newBlock,
  blankBoard,
  moveCard,
  updateBoardBlock,
  isBlockVisible,
  duplicateBlock,
  deleteBlock,
  safeImageUrl,
  publishSnapshot,
  relocateLayer,
  viewBlocks,
  projectViews,
  reportData,
} from "../src/model.js";
test("Kanban has editable columns, cards move without duplication, counts are derived", () => {
  const b = newBlock("kanban"),
    [a, c] = b.kanban.columns;
  b.kanban.cards = [
    { id: "one", columnId: a.id, title: "One" },
    { id: "two", columnId: a.id, title: "Two" },
  ];
  const moved = moveCard(b.kanban, "one", c.id);
  assert.equal(moved.cards.filter((x) => x.columnId === a.id).length, 1);
  assert.equal(moved.cards.filter((x) => x.columnId === c.id).length, 1);
  assert.equal(moved.cards.length, 2);
  assert.equal(b.kanban.cards[0].columnId, a.id);
  assert.equal(moveCard(moved, "one", "missing"), moved);
});
test("Moving a section carries its children; hiding it hides them and deletion keeps them", () => {
  const section = newBlock("section", 100, 100),
    child = { ...newBlock("text", 140, 180), parentId: section.id },
    other = newBlock("table", 1000, 1000),
    board = { ...blankBoard(), blocks: [section, child, other] };
  const moved = updateBoardBlock(board, section.id, { x: 150, y: 120 });
  assert.equal(moved.blocks[1].x, 190);
  assert.equal(moved.blocks[1].y, 200);
  assert.equal(moved.blocks[2].x, 1000);
  const hidden = updateBoardBlock(board, section.id, { hidden: true });
  assert.equal(isBlockVisible(hidden.blocks[1], hidden.blocks), false);
  assert.equal(isBlockVisible(hidden.blocks[2], hidden.blocks), true);
  const removed = deleteBlock(board, section.id);
  assert.equal(removed.blocks.length, 2);
  assert.equal(removed.blocks[0].parentId, "");
});
test("Duplicating a section makes independent copies of its children", () => {
  const s = newBlock("section"),
    c = { ...newBlock("kanban"), parentId: s.id },
    b = { ...blankBoard(), blocks: [s, c] };
  const result = duplicateBlock(b, s.id),
    copy = result.blocks[2],
    child = result.blocks[3];
  assert.notEqual(copy.id, s.id);
  assert.equal(child.parentId, copy.id);
  assert.notEqual(child.id, c.id);
  child.kanban.columns[0].name = "changed";
  assert.notEqual(c.kanban.columns[0].name, "changed");
});
test("Images reject script URLs and SVG data; source records stay private", () => {
  assert.equal(safeImageUrl("javascript:alert(1)"), "");
  assert.equal(safeImageUrl("data:image/svg+xml;base64,PHN2Zz4="), "");
  assert.ok(safeImageUrl("https://example.com/image.png"));
  assert.ok(safeImageUrl("data:image/png;base64,aGVsbG8="));
  const b = blankBoard();
  b.imageFiles = [{ path: "private/image" }];
  assert.ok(!("imageFiles" in publishSnapshot(b)));
});
test("Layers reorder, move into groups and sections, and return to root", () => {
  const a = newBlock("text"),
    b = newBlock("table"),
    s = newBlock("section"),
    board = {
      ...blankBoard(),
      groups: [{ id: "g", name: "Group" }],
      blocks: [a, b, s],
    };
  const reordered = relocateLayer(board, b.id, { beforeId: a.id });
  assert.equal(reordered.blocks[0].id, b.id);
  const grouped = relocateLayer(board, a.id, { groupId: "g" });
  assert.equal(grouped.blocks.at(-1).groupId, "g");
  const nested = relocateLayer(grouped, a.id, { parentId: s.id });
  assert.equal(nested.blocks.at(-1).parentId, s.id);
  assert.equal(nested.blocks.at(-1).groupId, "");
  const root = relocateLayer(nested, a.id);
  assert.equal(root.blocks.at(-1).parentId, "");
  assert.equal(relocateLayer(board, s.id, { parentId: s.id }), board);
});
test("Views isolate blocks, preserve all-view elements and respect hidden state", () => {
  const board = blankBoard();
  board.views.push({ id: "v2", name: "View 2" });
  board.blocks = [
    newBlock("text"),
    { ...newBlock("button"), viewId: "v2" },
    { ...newBlock("image"), viewId: "*" },
    { ...newBlock("text"), hidden: true },
  ];
  assert.equal(viewBlocks(board, "view-1").length, 2);
  assert.equal(viewBlocks(board, "v2").length, 2);
  assert.equal(projectViews({})[0].name, "View 1");
  assert.equal(publishSnapshot(board).views.length, 2);
});
test("K board pie and bar reports count cards per column and update after movement", () => {
  const k = newBlock("kanban"),
    r = newBlock("report");
  r.report = { sourceType: "kanban", kanbanId: k.id, kind: "pie" };
  assert.equal(reportData(r, [k]).data.length, 0);
  k.kanban.cards = [
    { id: "a", columnId: k.kanban.columns[0].id },
    { id: "b", columnId: k.kanban.columns[0].id },
  ];
  assert.deepEqual(
    reportData(r, [k]).data.map((d) => d.value),
    [2, 0, 0],
  );
  k.kanban = moveCard(k.kanban, "a", k.kanban.columns[1].id);
  assert.deepEqual(
    reportData(r, [k]).data.map((d) => d.value),
    [1, 1, 0],
  );
  assert.match(reportData(r, []).reason, /K board/);
});
