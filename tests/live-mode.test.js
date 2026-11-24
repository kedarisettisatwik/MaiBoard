import test from 'node:test';
import assert from 'node:assert/strict';
import {newBlock,appendLiveRow} from '../src/model.js';
test('Live row append preserves existing data, structure and other blocks',()=>{
  const table=newBlock('table'),text=newBlock('text');table.locked=true;
  const board={blocks:[table,text],edges:[],views:[{id:'view-1',locked:true}]};
  const original=structuredClone(board),ids=table.table.columns.map(c=>c.id),row=ids.map((_,i)=>`Value ${i}`);
  const next=appendLiveRow(board,table.id,row,ids);
  assert.deepEqual(board,original);
  assert.deepEqual(next.blocks[0].table.rows,[...table.table.rows,row]);
  assert.deepEqual({...next.blocks[0],table:table.table},table);
  assert.equal(next.blocks[1],text);
  assert.equal(next.edges,board.edges);
  assert.equal(next.views,board.views);
});
test('Live append rejects stale columns and invalid targets or values',()=>{
  const table=newBlock('table'),board={blocks:[table]},ids=table.table.columns.map(c=>c.id);
  assert.throws(()=>appendLiveRow(board,'missing',[],[]));
  assert.throws(()=>appendLiveRow(board,table.id,ids.map(()=>''),ids.toReversed()),/columns changed/);
  assert.throws(()=>appendLiveRow(board,table.id,ids.map(()=>({})),ids),/characters/);
});
