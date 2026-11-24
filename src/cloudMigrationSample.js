import { blankBoard, newBlock, uid } from './model.js';

// Every preview starts with fresh IDs and data, so saving a sample creates an independent project.
export function createCloudMigrationSample(assetBase = new URL(
  import.meta.env?.BASE_URL || '/',
  globalThis.location?.href || 'http://localhost/',
)) {
  const board = blankBoard('Cloud migration · Wave 02');
  board.views = [
    { id: 'view-1', name: 'Migration overview' },
    { id: 'execution', name: 'Execution plan' },
    { id: 'architecture', name: 'Architecture map' },
  ];
  const add = (type, name, x, y, w, h, viewId = 'view-1') => {
    const block = { ...newBlock(type, x, y), name, w, h, viewId };
    board.blocks.push(block);
    return block;
  };
  const text = (name, html, x, y, w, h, viewId) => {
    const block = add('text', name, x, y, w, h, viewId);
    block.html = html;
    return block;
  };
  const image = (name, x, y, w, h, viewId) => {
    const block = add('image', name, x, y, w, h, viewId);
    block.image = {
      src: new URL('samples/cloud-migration-architecture.svg', assetBase).href,
      alt: 'On-premises workloads connect through secure transit to a managed cloud landing zone.',
      fit: 'contain',
    };
    block.style.padding = 8;
    return block;
  };
  const button = (label, targetViewId, x, y, w, viewId) => {
    const block = add('button', label, x, y, w, 48, viewId);
    block.link = { label, action: 'view', targetViewId, showIcon: true };
    return block;
  };

  text('Wave 02 brief', '<p><strong style="color:#2563eb">CLOUD MIGRATION / WAVE 02</strong></p><h2>A migration plan<br>you can see.</h2><p>Map dependencies. Surface risk. Move every workload toward a verified landing zone.</p>', 25, 25, 620, 330);
  image('Landing zone architecture', 965, 25, 650, 330);
  button('Open execution', 'execution', 685, 95, 240);
  button('Architecture map', 'architecture', 685, 185, 240);

  const table = add('table', 'Workload migration register', 25, 800, 900, 450);
  table.table = {
    columns: [
      { id: uid(), name: 'Workload' },
      { id: uid(), name: 'Landing zone', type: 'suggest', options: ['Production', 'Data', 'Shared', 'Security'] },
      { id: uid(), name: 'Phase', type: 'select', options: ['Discover', 'Migrate', 'Validate'], colors: { Discover: '#1e40af', Migrate: '#0ea5e9', Validate: '#2563eb' } },
      { id: uid(), name: 'Effort / days' },
      { id: uid(), name: 'Risk', type: 'select', options: ['Low', 'Medium', 'High'], colors: { Low: '#2563eb', Medium: '#293141', High: '#ea580c' } },
    ],
    rows: [
      ['Commerce API', 'Production', 'Validate', '12', 'Low'],
      ['Analytics lake', 'Data', 'Migrate', '18', 'Medium'],
      ['Internal tools', 'Shared', 'Discover', '8', 'Low'],
      ['Identity service', 'Security', 'Validate', '15', 'High'],
      ['Customer CRM', 'Production', 'Migrate', '21', 'Medium'],
      ['Batch processing', 'Data', 'Discover', '10', 'Low'],
    ],
    pagination: true, pageSize: 5, paginationPosition: 'bottom-right',
  };
  const report = (name, kind, x, y, w, h) => {
    const block = add('report', name, x, y, w, h);
    block.report = {
      kind, sourceType: 'table', tableId: table.id,
      labelColumn: table.table.columns[0].id,
      valueColumn: table.table.columns[3].id,
      respondToFilters: 'all',
    };
    return block;
  };
  const count = report('Workloads', 'card', 25, 400, 420, 200);
  Object.assign(count.report, { metric: 'count', caption: 'Workloads', valueFontSize: 38, decimals: 0 });
  const effort = report('Estimated days', 'card', 475, 400, 450, 200);
  Object.assign(effort.report, { metric: 'sum', caption: 'Estimated days', valueFontSize: 38, decimals: 0 });
  const filter = add('filter', 'Phase', 25, 630, 900, 135);
  filter.filter = { tableId: table.id, columnId: table.table.columns[2].id, mode: 'dropdown', label: 'Phase' };
  report('Effort by workload', 'bar', 965, 400, 650, 330);
  const phases = report('Migration phases', 'pie', 965, 800, 650, 450);
  Object.assign(phases.report, { labelColumn: table.table.columns[2].id, aggregation: 'count' });
  text('Exit criteria', '<h3>Before the wave closes</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>Recovery point validated</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Network policy reviewed</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Cost tags &amp; ownership complete</p></div></li></ul>', 25, 1290, 900, 280);

  text('Execution overview', '<h2>One wave. Clear ownership.</h2><p>Break the migration into accountable work packages, then move cards as evidence is verified.</p>', 25, 25, 1100, 175, 'execution');
  const kanban = add('kanban', 'Wave execution', 25, 235, 1350, 540, 'execution');
  kanban.kanban.columns = ['Prepare', 'Migrate', 'Verify'].map(name => ({ id: uid(), name }));
  kanban.kanban.cards = [
    ['Validate recovery plan', 'Platform · backup and restore', 0],
    ['Move commerce workload', 'Application team · wave 02', 1],
    ['Check service health', 'SRE · synthetic checks', 2],
  ].map(([title, description, column]) => ({ id: uid(), title, description, columnId: kanban.kanban.columns[column].id }));
  button('Back to overview', 'view-1', 25, 820, 240, 'execution');
  button('Explore architecture', 'architecture', 300, 820, 250, 'execution');

  text('Architecture overview', '<h2>Connect the migration story.</h2><p>Use arrows to show sequence and dependencies between blocks.</p>', 25, 25, 1100, 210, 'architecture');
  const flow = [
    ['Discover', 'Inventory workloads and confirm owners.'],
    ['Assess', 'Review dependencies, risk and effort.'],
    ['Migrate', 'Move, validate and hand over.'],
  ].map(([name, description], i) => text(name, `<h2>${name}</h2><p>${description}</p>`, 25 + i * 400, 285, 300, 220, 'architecture'));
  for (let i = 0; i < 2; i++) board.edges.push({
    id: uid(), from: flow[i].id, to: flow[i + 1].id,
    color: '#2563eb', width: 3, dash: i ? 'dashed' : 'solid',
    startArrow: false, endArrow: true, curve: true,
  });
  image('Landing zone reference', 25, 550, 1100, 320, 'architecture');
  button('Back to overview', 'view-1', 25, 910, 240, 'architecture');
  button('Open execution', 'execution', 300, 910, 240, 'architecture');
  return board;
}
