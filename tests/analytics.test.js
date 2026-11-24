import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,blankBoard} from '../src/model.js';
import {reportCardData} from '../src/analytics.js';
import {createSample,sampleProjects} from '../src/templates.js';
const table=newBlock('table');table.table.rows=[['A','-10'],['B','0'],['C','20'],['C','40'],['D','invalid'],['E','']];
const config={tableId:table.id,valueColumn:table.table.columns[1].id};
test('Report cards calculate numeric aggregates and exclude blanks and invalid values',()=>{
  for(const [metric,value] of [['max',40],['min',-10],['average',12.5],['sum',50],['count',6],['distinct',5]])assert.equal(reportCardData({...config,metric},[table]).value,value);
  assert.equal(reportCardData({...config,metric:'average'},[table]).skipped,2);
});
test('Range counts support inclusive and exclusive boundaries, zero, negative values and invalid ranges',()=>{
  const r={...config,metric:'rangeCount',rangeMin:'0',rangeMax:'40'};
  assert.equal(reportCardData(r,[table]).value,3);
  assert.equal(reportCardData({...r,includeMin:false,includeMax:false},[table]).value,1);
  assert.match(reportCardData({...r,rangeMin:'50'},[table]).reason,/valid/);
  assert.match(reportCardData({...r,rangeMax:''},[table]).reason,/valid/);
  assert.equal(reportCardData({...r,rangeMin:'80',rangeMax:'90'},[table]).value,0);
});
test('Report cards update with source edits and return actionable missing-source states',()=>{
  assert.equal(reportCardData({...config,metric:'max'},[{...table,table:{...table.table,rows:[['A','100']]}}]).value,100);
  assert.match(reportCardData(config,[]).reason,/source table/);
  assert.match(reportCardData({...config,valueColumn:'deleted'},[table]).reason,/column/);
});
test('Samples create independent usable projects with linked reports and tab ownership',()=>{
  const ids=new Set();for(const sample of sampleProjects){const b=createSample(sample.id);assert.ok(b.blocks.length>2);for(const block of b.blocks){assert.ok(!ids.has(block.id));ids.add(block.id);if(block.type==='report'&&block.report.sourceType==='table')assert.ok(b.blocks.find(x=>x.id===block.report.tableId));if(block.tabParentId){const tabs=b.blocks.find(x=>x.id===block.tabParentId);assert.ok(tabs.tabs.some(t=>t.id===block.tabId));}}}
  const a=createSample('reporting'),b=createSample('reporting');a.blocks[1].table.rows[0][1]='999';assert.notEqual(a.blocks[1].table.rows[0][1],b.blocks[1].table.rows[0][1]);
  assert.deepEqual(blankBoard('Untitled').blocks,[]);
});
