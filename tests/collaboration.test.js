import test from 'node:test';
import assert from 'node:assert/strict';
import {sharingSettings,rowAudience,withAudit,baseBoard,mergeEntries,projectExport,projectImport,AUDIT_BY,AUDIT_ON} from '../src/collaboration.js';
const board=()=>({version:2,name:'Team',views:[{id:'v1',name:'Overview'}],blocks:[{id:'t1',type:'table',x:0,y:0,w:500,table:{columns:[{id:'person',name:'Name'},{id:'score',name:'Score'}],rows:[['Sam','90']],personal:{enabled:true,mode:'mapping',columnId:'person',mapping:[{email:'sam@example.com',value:'Sam'}]}}}],edges:[],groups:[]});
test('sharing normalizes addresses and rejects invalid input',()=>{
 assert.deepEqual(sharingSettings({audience:'emails',viewerEmails:' SAM@EXAMPLE.COM, sam@example.com; jane@example.com'}).viewerEmails,['sam@example.com','jane@example.com']);
 assert.throws(()=>sharingSettings({editorEmails:'not-an-email'}));
});
test('personal rows require an unambiguous account mapping',()=>{
 const t=board().blocks[0].table;assert.equal(rowAudience(t,t.rows[0]),'sam@example.com');
 assert.throws(()=>rowAudience(t,['Someone else','100']));
 t.personal.mapping.push({email:'other@example.com',value:'Sam'});assert.throws(()=>rowAudience(t,t.rows[0]));
 t.personal={enabled:true,columnId:'person',mode:'email'};assert.throws(()=>rowAudience(t,['Sam','90']));assert.equal(rowAudience(t,['SAM@example.com','90']),'sam@example.com');
});
test('audit fields use names, remain stable, and preserve row ownership',()=>{
 const b=board().blocks[0];b.table.audit=true;const audited=withAudit(b,{uid:'sam-id',displayName:'Sam'},'2026-11-25T09:00:00Z');
 assert.equal(audited.table.rows[0][2],'Sam');assert.equal(audited.table.columns[2].id,AUDIT_BY);assert.equal(audited.table.columns[3].id,AUDIT_ON);
 assert.deepEqual(withAudit(audited,{uid:'other',displayName:'Other'},'2027-01-01').table,audited.table);
});
test('team submissions hydrate independently and are not duplicated in base layout',()=>{
 const original=board(),merged=mergeEntries(original,[{id:'entry1',tableId:'t1',columnIds:['person','score'],values:['Sam','88'],createdByUid:'sam-id',createdByName:'Sam',createdOn:'2026-11-25'}]);
 assert.equal(merged.blocks[0].table.rows.length,2);assert.deepEqual(baseBoard(merged).blocks[0].table.rows,[['Sam','90']]);
 const duplicate=structuredClone(merged.blocks[0]);duplicate.id='t2';merged.blocks.push(duplicate);const clean=baseBoard(merged);assert.equal(clean.blocks[1].table.rows.length,2);assert.equal(clean.blocks[1].table.rowMeta[1].entry,false);
 assert.equal(original.blocks[0].table.rows.length,1);
});
test('JSON roundtrip preserves data and all views, removes cloud file pointers and row ownership',()=>{
 const b=board();b.views.push({id:'v2',name:'Detail'});b.blocks[0].table.teamAdd=true;b.blocks[0].table.rowMeta=[{uid:'private'}];b.csvFiles=[{path:'private/path'}];
 const imported=projectImport(projectExport(b));assert.equal(imported.views.length,2);assert.deepEqual(imported.blocks[0].table.rows,[['Sam','90']]);assert.equal(imported.blocks[0].table.rowMeta,undefined);assert.equal(imported.blocks[0].table.teamAdd,false);assert.deepEqual(imported.csvFiles,[]);
 assert.throws(()=>projectImport('{"version":2,"blocks":[],"views":[],"edges":[]}'));
 const invalid=board();invalid.blocks.push({...invalid.blocks[0]});assert.throws(()=>projectImport(JSON.stringify(invalid)));
});
