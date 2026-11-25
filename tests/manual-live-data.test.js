import test from 'node:test';
import assert from 'node:assert/strict';
import {blankBoard,newBlock,updateBoardBlock,verticalTabWidth,parentBounds} from '../src/model.js';
import {updateLiveTable} from '../src/liveData.js';

test('Live data edits preserve structure and another member’s attribution',()=>{
 const b=blankBoard('Team'),table=newBlock('table',40,50);table.table={columns:[{id:'value',name:'Score'}],rows:[['90']],audit:true,rowMeta:[{id:'submission',tableId:table.id,entry:true,uid:'sam',name:'Sam',createdAt:'2026-11-25T12:00:00Z'}]};b.blocks=[table];
 const next=updateLiveTable(b,table.id,{...table.table,rows:[['95']]},{uid:'editor',displayName:'Editor'});
 assert.equal(next.blocks[0].table.rows[0][0],'95');assert.equal(next.blocks[0].table.rowMeta[0].uid,'sam');assert.equal(next.blocks[0].table.rows[0][1],'Sam');assert.equal(next.blocks[0].x,40);assert.deepEqual(b.blocks[0].table.rows,[['90']]);
 const deleted=updateLiveTable(next,table.id,{...next.blocks[0].table,rows:[],rowMeta:[]},{uid:'editor'});assert.equal(deleted.blocks[0].table.rows.length,0);
});
test('Live data accepts record changes but rejects schema drift and invalid restricted choices',()=>{
 const b=blankBoard(),t=newBlock('table');t.table={columns:[{id:'status',name:'Status',type:'select',options:['Ready','Done']}],rows:[['Ready']]};b.blocks=[t];
 assert.throws(()=>updateLiveTable(b,t.id,{columns:[{id:'other'}],rows:[['Done']]}));
 assert.throws(()=>updateLiveTable(b,t.id,{...t.table,rows:[['Invalid']]}));
 assert.equal(updateLiveTable(b,t.id,{...t.table,rows:[['Done']]},{}).blocks[0].table.rows[0][0],'Done');
});
test('vertical tab navigation width clamps and keeps children inside the remaining canvas',()=>{
 const b=blankBoard(),tabs=newBlock('tabs',0,0),child=newBlock('text',300,0);tabs.w=600;tabs.h=500;tabs.tabLayout='vertical';child.tabParentId=tabs.id;child.tabId=tabs.tabs[0].id;child.w=250;b.blocks=[tabs,child];
 const wide=updateBoardBlock(b,tabs.id,{tabNavWidth:350});const c=wide.blocks.find(x=>x.id===child.id),bounds=parentBounds(wide,c);
 assert.equal(verticalTabWidth(wide.blocks[0]),350);assert.ok(c.x+c.w<=bounds.x+bounds.w);assert.ok(c.w<=bounds.w);
 assert.equal(verticalTabWidth({...tabs,tabNavWidth:9999}),360);assert.equal(verticalTabWidth({...tabs,tabNavWidth:10}),80);
});

test('Live mode cannot modify published source tables in a personal workspace',()=>{const table={columns:[{id:'name',name:'Name'}],rows:[['Original']]};const board={blocks:[{id:'base',type:'table',sourceBlock:true,table},{id:'mine',type:'table',table:structuredClone(table)}]};assert.throws(()=>updateLiveTable(board,'base',{...table,rows:[['Changed']]},{uid:'me'}),/read only/);const next=updateLiveTable(board,'mine',{...table,rows:[['My edit']]},{uid:'me'});assert.equal(next.blocks[0].table.rows[0][0],'Original');assert.equal(next.blocks[1].table.rows[0][0],'My edit');});
