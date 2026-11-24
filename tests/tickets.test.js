import test from 'node:test';
import assert from 'node:assert/strict';
import {createSample} from '../src/templates.js';
import {reportCardData} from '../src/analytics.js';
import {filteredRows,isoDate,validCell} from '../src/tableFeatures.js';
import {reportData,appendLiveRow} from '../src/model.js';
const board=createSample('tickets'),table=board.blocks.find(b=>b.type==='table');
const col=name=>table.table.columns.find(c=>c.name===name);
test('Ticket completion and closed-month cards use nonblank values and valid inclusive dates',()=>{
  const cards=board.blocks.filter(b=>b.report?.kind==='card');
  assert.deepEqual(cards.map(b=>reportCardData(b.report,board.blocks).value),[8,62.5,2,3]);
  assert.equal(isoDate('2026-02-30'),null);assert.equal(isoDate('2024-02-29'),'2024-02-29');assert.equal(isoDate(''),null);
});
test('Ticket filters combine issue search, choices and dates while retaining original row indexes',()=>{
  const filters={[col('Issue').id]:{value:'PAYROLL'},[col('Client').id]:{value:'Northstar'},[col('Date closed').id]:{from:'2026-11-01',to:'2026-11-30'}};
  const rows=filteredRows(table.table,filters);assert.deepEqual(rows.map(x=>x.index),[1]);
  assert.equal(filteredRows(table.table,{[col('status').id]:{value:'resolved'}}).length,3);
  assert.equal(filteredRows(table.table,{[col('Date closed').id]:{from:'2026-12-01',to:'2026-11-01'}}).length,0);
});
test('Filtered ticket cards and category counts share the same rows',()=>{
  const rows=filteredRows(table.table,{[col('Client').id]:{value:'Acme'}}).map(x=>x.row),blocks=board.blocks.map(b=>b.id===table.id?{...b,table:{...b.table,rows}}:b);
  const filled=board.blocks.find(b=>b.name==='NASHCM filled');assert.equal(reportCardData(filled.report,blocks).value,50);
  const chart=board.blocks.find(b=>b.name==='Tickets by status');assert.equal(reportData(chart,blocks).data.reduce((s,d)=>s+d.value,0),4);
});
test('Restricted choices reject arbitrary status while client suggestions accept new names',()=>{
  assert.equal(validCell(col('status'),'new status'),false);assert.equal(validCell(col('Client'),'New customer'),true);
  const values=table.table.columns.map(()=>''),ids=table.table.columns.map(c=>c.id);values[6]='bogus';assert.throws(()=>appendLiveRow(board,table.id,values,ids),/existing option/);values[6]='pending';assert.equal(appendLiveRow(board,table.id,values,ids).blocks.find(b=>b.id===table.id).table.rows.length,9);
  assert.deepEqual(col('priority').colors,{low:'#2563eb',medium:'#000000',high:'#f97316',ASAP:'#dc2626'});
});
