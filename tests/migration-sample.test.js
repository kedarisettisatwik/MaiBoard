import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSample, sampleProjects } from '../src/templates.js';
import { createCloudMigrationSample } from '../src/cloudMigrationSample.js';
import { reportCardData } from '../src/analytics.js';
import { reportData, publishSnapshot } from '../src/model.js';
import { filterTableByBlocks, reportBlocksFor } from '../src/tableFeatures.js';

test('cloud migration is a gallery sample with independent, fully linked views', () => {
  assert.ok(sampleProjects.some(p => p.id === 'migration'));
  const board = createSample('migration'), other = createSample('migration');
  assert.deepEqual(board.views.map(v => v.name), ['Migration overview', 'Execution plan', 'Architecture map']);
  const views = new Set(board.views.map(v => v.id)), ids = new Set(board.blocks.map(b => b.id));
  assert.equal(ids.size, board.blocks.length);
  for (const block of board.blocks) {
    assert.ok(views.has(block.viewId));
    if (block.link?.action === 'view') assert.ok(views.has(block.link.targetViewId));
    if (block.report) assert.ok(ids.has(block.report.tableId));
    if (block.filter) assert.ok(ids.has(block.filter.tableId));
  }
  for (const edge of board.edges) {
    assert.ok(ids.has(edge.from) && ids.has(edge.to));
    assert.equal(board.blocks.find(b => b.id === edge.from).viewId, 'architecture');
    assert.equal(board.blocks.find(b => b.id === edge.to).viewId, 'architecture');
  }
  const table = board.blocks.find(b => b.type === 'table');
  other.blocks.find(b => b.type === 'table').table.rows[0][0] = 'Changed';
  assert.equal(table.table.rows[0][0], 'Commerce API');
  assert.ok(other.blocks.every(b => !ids.has(b.id)));
  assert.doesNotThrow(() => JSON.stringify(publishSnapshot(board)));
});

test('the phase filter drives the workload table, report cards and charts together', () => {
  const board = createSample('migration'), table = board.blocks.find(b => b.type === 'table');
  const filter = board.blocks.find(b => b.type === 'filter'), values = { [filter.id]: { value: 'Migrate' } };
  assert.equal(filterTableByBlocks(table, board.blocks, values).length, 2);
  const count = board.blocks.find(b => b.name === 'Workloads'), sum = board.blocks.find(b => b.name === 'Estimated days');
  assert.equal(reportCardData(count.report, board.blocks).value, 6);
  assert.equal(reportCardData(sum.report, board.blocks).value, 84);
  assert.equal(reportCardData(count.report, reportBlocksFor(count.report, board.blocks, values)).value, 2);
  assert.equal(reportCardData(sum.report, reportBlocksFor(sum.report, board.blocks, values)).value, 39);
  const chart = board.blocks.find(b => b.name === 'Migration phases');
  assert.deepEqual(reportData(chart, reportBlocksFor(chart.report, board.blocks, values)).data, [{ name: 'Migrate', value: 2 }]);
});

test('sample image URLs work under GitHub Pages and use a bundled asset', () => {
  const board = createCloudMigrationSample('https://kedarisettisatwik.github.io/MaiBoard/');
  for (const image of board.blocks.filter(b => b.type === 'image')) {
    assert.equal(image.image.src, 'https://kedarisettisatwik.github.io/MaiBoard/samples/cloud-migration-architecture.svg');
  }
  assert.match(readFileSync(new URL('../public/samples/cloud-migration-architecture.svg', import.meta.url), 'utf8'), /<svg/);
  assert.match(readFileSync(new URL('../public/samples/migration.svg', import.meta.url), 'utf8'), /Cloud migration/);
});
