// Shared, framework-free data transformations. Private identity is always email/UID,
// never a display name supplied by a recipient.
export const AUDIT_BY = '__createdBy';
export const AUDIT_ON = '__createdOn';
export const emailKey = value => String(value || '').trim().toLowerCase();
export function emailList(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[\n,;]+/);
  return [...new Set(list.map(emailKey).filter(Boolean))];
}
export function sharingSettings(value = {}) {
  const audience = ['public', 'emails', 'users'].includes(value.audience) ? value.audience : 'public';
  const viewers = emailList(value.viewerEmails), editors = emailList(value.editorEmails);
  if ([...viewers, ...editors].some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) throw Error('Enter valid email addresses, separated by commas.');
  if (viewers.length + editors.length > 80) throw Error('Use up to 80 email addresses per project.');
  return { audience, viewerEmails: viewers, editorEmails: editors };
}
export function rowAudience(table, row) {
  if (!table.personal?.enabled) return '*';
  const index = table.columns.findIndex(c => c.id === table.personal.columnId);
  if (index < 0) throw Error('Choose an identity column for each personal table.');
  const value = String(row[index] ?? '').trim();
  if (table.personal.mode !== 'mapping') {
    const email = emailKey(value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Every personal row needs a valid email, or an email-to-value mapping.');
    return email;
  }
  const matches = (table.personal.mapping || []).filter(m => String(m.value).trim() === value).map(m => emailKey(m.email));
  if (matches.length !== 1 || !matches[0].includes('@')) throw Error(`Map “${value}” to exactly one recipient email before publishing.`);
  return matches[0];
}
export function withAudit(block, user, now = new Date().toISOString()) {
  const next = structuredClone(block), table = next.table;
  if (!table.audit) return next;
  const by = table.columns.findIndex(c => c.id === AUDIT_BY), on = table.columns.findIndex(c => c.id === AUDIT_ON);
  if (by < 0) table.columns.push({ id: AUDIT_BY, name: 'Created by', type: 'text', system: true });
  if (on < 0) table.columns.push({ id: AUDIT_ON, name: 'Created on', type: 'date', system: true });
  table.rowMeta ||= [];
  table.rows = table.rows.map((row, i) => {
    const meta = table.rowMeta[i] || { id: crypto.randomUUID(), uid: user?.uid || '', name: user?.displayName || 'Team member', createdAt: now };
    table.rowMeta[i] = meta;
    const values = [...row];
    values[table.columns.findIndex(c => c.id === AUDIT_BY)] = meta.name || 'Team member';
    values[table.columns.findIndex(c => c.id === AUDIT_ON)] = String(meta.createdAt || now).slice(0, 10);
    return values;
  });
  return next;
}
export function mergeEntries(board, entries) {
  const next = structuredClone(board);
  for (const b of next.blocks.filter(b => b.type === 'table')) {
    const table = b.table;
    table.rowMeta = table.rows.map((_,i)=>table.rowMeta?.[i]||null);
    for (const entry of entries.filter(e => e.tableId === b.id)) {
      const row = table.columns.map(c => c.id === AUDIT_BY ? entry.createdByName : c.id === AUDIT_ON ? String(entry.createdAt?.toDate?.().toISOString() || entry.createdOn || '').slice(0,10) : entry.values[entry.columnIds.indexOf(c.id)] ?? '');
      table.rows.push(row);
      table.rowMeta.push({ id: entry.id, tableId:b.id, entry: true, uid: entry.createdByUid, name: entry.createdByName, createdAt: entry.createdOn });
    }
  }
  return next;
}
export function baseBoard(board) {
  const next = structuredClone(board);
  for (const b of next.blocks.filter(b => b.type === 'table')) {
    const keep = b.table.rows.map((_, i) => !b.table.rowMeta?.[i]?.entry || b.table.rowMeta[i].tableId!==b.id);
    b.table.rows = b.table.rows.filter((_, i) => keep[i]);
    b.table.rowMeta = (b.table.rowMeta || []).filter((_, i) => keep[i]);
    b.table.rowMeta=b.table.rowMeta.map(m=>m?.entry?{...m,id:crypto.randomUUID(),entry:false,tableId:b.id}:m);
  }
  return next;
}
export function projectExport(board) {
  const copy = structuredClone(board);
  delete copy.csvFiles; delete copy.imageFiles;
  for (const b of copy.blocks) { delete b.csv; if(b.table) delete b.table.rowMeta; }
  return JSON.stringify({ format: 'MaiBoard', formatVersion: 1, exportedAt: new Date().toISOString(), board: copy }, null, 2);
}
export function projectImport(text) {
  if (new TextEncoder().encode(text).length > 2000000) throw Error('Choose a MaiBoard JSON file smaller than 2 MB.');
  const envelope = JSON.parse(text), board = envelope.format === 'MaiBoard' ? envelope.board : envelope;
  if (!board || board.version !== 2 || !Array.isArray(board.blocks) || !Array.isArray(board.views) || !Array.isArray(board.edges)) throw Error('This is not a supported MaiBoard project.');
  const allowed = ['text','table','tabs','button','section','image','kanban','report','filter'];
  const ids = new Set();
  for (const b of board.blocks) {
    if (!b || typeof b.id !== 'string' || !b.id || b.id.includes('/') || b.id.length>100 || ids.has(b.id) || !allowed.includes(b.type) || ![b.x,b.y,b.w].every(Number.isFinite)) throw Error('The project contains invalid blocks.');
    ids.add(b.id);
    if (b.type === 'table' && (!Array.isArray(b.table?.columns) || !Array.isArray(b.table?.rows) || b.table.rows.some(r => !Array.isArray(r) || r.some(v => v !== null && !['string','number','boolean'].includes(typeof v))))) throw Error('The project contains an invalid table.');
    if(b.type==='table'&&(b.table.columns.some(c=>!c||typeof c.id!=='string'||typeof c.name!=='string')||new Set(b.table.columns.map(c=>c.id)).size!==b.table.columns.length))throw Error('The project contains invalid table columns.');
    if(b.type==='text'&&typeof b.html!=='string')throw Error('The project contains invalid text.');
    if(b.type==='button'&&(!b.link||typeof b.link.label!=='string'))throw Error('The project contains an invalid button.');
    if(b.type==='tabs'&&(!Array.isArray(b.tabs)||b.tabs.some(t=>!t||typeof t.id!=='string'||typeof t.name!=='string')))throw Error('The project contains invalid tabs.');
    if(b.type==='kanban'&&(!Array.isArray(b.kanban?.columns)||!Array.isArray(b.kanban?.cards)))throw Error('The project contains an invalid K board.');
    if(b.type==='report'&&(!b.report||typeof b.report!=='object'))throw Error('The project contains an invalid report.');
    if(b.type==='image'&&(!b.image||typeof b.image.src!=='string'))throw Error('The project contains an invalid image.');
    delete b.csv;
    if (b.table) { delete b.table.rowMeta; b.table.teamAdd = false; b.table.teamDeleteOwn = false; }
  }
  if (!board.views.length || board.views.some(v => !v || typeof v.id !== 'string' || typeof v.name !== 'string') || new Set(board.views.map(v=>v.id)).size!==board.views.length) throw Error('The project needs valid views.');
  if(board.edges.some(e=>!e||typeof e.id!=='string'||!ids.has(e.from)||!ids.has(e.to)))throw Error('The project contains invalid connections.');
  if(board.groups && (!Array.isArray(board.groups)||board.groups.some(g=>!g||typeof g.id!=='string'||typeof g.name!=='string')))throw Error('The project contains invalid layer groups.');
  board.name = String(board.name || 'Imported project').slice(0,100);
  board.csvFiles = []; board.imageFiles = []; board.groups ||= [];
  return structuredClone(board);
}
export function downloadProject(board) {
  const url = URL.createObjectURL(new Blob([projectExport(board)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `${board.name || 'MaiBoard'}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
