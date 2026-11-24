import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,duplicateBlock,publishSnapshot} from '../src/model.js';
import {filterTableByBlocks} from '../src/tableFeatures.js';
const table=newBlock('table');table.table.rows=[['A','10'],['B','20'],['AB','30']];
const filter=newBlock('filter');filter.filter={tableId:table.id,columnId:table.table.columns[0].id,mode:'text',applyToReports:false};
test('Standalone filters affect table rows and optionally reports without mutating data',()=>{
  const board=[table,filter],values={[filter.id]:{value:'A'}};
  assert.deepEqual(filterTableByBlocks(table,board,values).map(x=>x.index),[0,2]);
  assert.equal(filterTableByBlocks(table,board,values,true).length,3);
  assert.equal(filterTableByBlocks(table,[table,{...filter,filter:{...filter.filter,applyToReports:true}}],values,true).length,2);
  assert.equal(table.table.rows.length,3);
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
