import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,duplicateBlock,publishSnapshot} from '../src/model.js';
import {filterTableByBlocks,reportBlocksFor} from '../src/tableFeatures.js';
const table=newBlock('table');table.table.rows=[['A','10'],['B','20'],['AB','30']];
const filter=newBlock('filter');filter.filter={tableId:table.id,columnId:table.table.columns[0].id,mode:'text',applyToReports:false};
test('Standalone filters affect table rows and optionally reports without mutating data',()=>{
  const board=[table,filter],values={[filter.id]:{value:'A'}};
  assert.deepEqual(filterTableByBlocks(table,board,values).map(x=>x.index),[0,2]);
  assert.equal(filterTableByBlocks(table,board,values,[]).length,3);
  assert.equal(filterTableByBlocks(table,board,values,[filter.id]).length,2);
  assert.equal(table.table.rows.length,3);
});
test('Each report independently selects filters; select all includes newly created filters',()=>{
  const second={...filter,id:'second'},blocks=[table,filter,second],values={[filter.id]:{value:'A'},second:{value:'B'}};
  assert.equal(reportBlocksFor({respondToFilters:[]},blocks,values)[0].table.rows.length,3);
  assert.equal(reportBlocksFor({respondToFilters:[filter.id]},blocks,values)[0].table.rows.length,2);
  assert.deepEqual(reportBlocksFor({respondToFilters:'all'},blocks,values)[0].table.rows,[['AB','30']]);
  assert.equal(newBlock('filter').filter.showClear,undefined);assert.equal(newBlock('filter').filter.label,'');
});
test('Multiple filter blocks combine, including two filters on the same column',()=>{
  const second={...filter,id:'second',filter:{...filter.filter,applyToReports:true}};
  assert.deepEqual(filterTableByBlocks(table,[filter,second],{[filter.id]:{value:'A'},second:{value:'B'}}).map(x=>x.index),[2]);
  assert.equal(filterTableByBlocks(table,[{...filter,hidden:true}],{[filter.id]:{value:'A'}}).length,3);
});
test('New cards have no caption; filter settings persist in publication without runtime values',()=>{
  assert.equal(newBlock('report').report.caption,undefined);
  const board={blocks:[table,filter],edges:[]};const snapshot=publishSnapshot(board);
  assert.equal(snapshot.blocks[1].filter.applyToReports,false);
});
