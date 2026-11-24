import test from 'node:test';
import assert from 'node:assert/strict';
import {paginateRows} from '../src/tableFeatures.js';
import {minimumBlockHeight,newBlock,updateBoardBlock} from '../src/model.js';
import {sampleProjects} from '../src/templates.js';
test('Pagination retains original row indexes and clamps after deletions and page size changes',()=>{
  const rows=Array.from({length:23},(_,index)=>({index,row:[index]}));
  assert.deepEqual(paginateRows(rows,2,10).rows.map(x=>x.index),[10,11,12,13,14,15,16,17,18,19]);
  assert.equal(paginateRows(rows,9,10).page,3);assert.equal(paginateRows(rows,3,10).rows.length,3);
  assert.equal(paginateRows(rows.slice(0,3),3,10).page,1);assert.equal(paginateRows(rows,2,5).pages,5);
  assert.equal(paginateRows(rows,2,10,false).rows.length,23);assert.equal(paginateRows([],5,10).pages,1);
});
test('Filter minimum height is compact and allows room for optional controls',()=>{
  const filter=newBlock('filter');assert.equal(filter.h,80);assert.equal(minimumBlockHeight(filter),80);
  const board={blocks:[filter],edges:[]};const updated=updateBoardBlock(board,filter.id,{h:80,filter:{...filter.filter,label:'Client',showClear:true}});
  assert.equal(updated.blocks[0].h,126);
});
test('Gallery contains only requested samples and blank is supplied separately by dashboard',()=>{
  assert.deepEqual(sampleProjects.map(x=>x.name),['Team delivery','Budget review','Employee onboarding']);
});
