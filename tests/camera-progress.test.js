import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraForView,rememberProjectZoom,readProjectZoom} from '../src/camera.js';
import {recordInteraction,applyViewerProgress,applyLiveInteraction,checklistHtml,cacheProgress,readCachedProgress,kanbanColumnWidth,saveColumnWidths,readColumnWidths} from '../src/viewerProgress.js';
import {blankBoard,newBlock,publishSnapshot} from '../src/model.js';
import {projectExport,projectImport} from '../src/collaboration.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('global project zoom survives differently sized views, empty views and browser preference reloads',()=>{
  const store=storage(),rect={width:1200,height:700};rememberProjectZoom('owner/project',1.4,store);
  const zoom=readProjectZoom('owner/project',store);assert.equal(zoom,1.4);
  assert.equal(cameraForView([{x:0,y:0,w:400,h:200}],rect,zoom).z,1.4);
  const large=cameraForView([{x:1800,y:900,w:3000,h:2400}],rect,zoom);assert.equal(large.z,1.4);assert(Number.isFinite(large.x));
  assert.equal(cameraForView([],rect,zoom).z,1.4);assert.notEqual(cameraForView([{x:0,y:0,w:3000,h:2400}],rect).z,1.4);
  assert.equal(readProjectZoom('other/project',store),null);rememberProjectZoom('owner/project',NaN,store);assert.equal(readProjectZoom('owner/project',store),1.4);
});
test('whole-project vertical navigation survives export/import and publication independently of block tabs',()=>{
  const board=blankBoard();board.showViewNavigation=true;board.viewNavigationLayout='vertical';board.views.push({id:'two',name:'Second'});const block=newBlock('tabs');block.tabLayout='horizontal';board.blocks=[block];
  const imported=projectImport(projectExport(board)),published=publishSnapshot(imported);assert.equal(published.viewNavigationLayout,'vertical');assert.equal(published.blocks[0].tabLayout,'horizontal');assert.equal(published.showViewNavigation,true);assert.equal(blankBoard().showViewNavigation,false);
});
const fixture=()=>({blocks:[{id:'todo',type:'text',html:'<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Read</p></li><li data-type="taskItem" data-checked="true"><p>Run</p></li></ul>'},{id:'table',type:'table',table:{columns:[{id:'name',type:'text'},{id:'done',type:'boolean'}],rows:[['Alex','false']]}},{id:'k',type:'kanban',kanban:{columns:[{id:'a',name:'To do'},{id:'b',name:'Done'}],cards:[{id:'c',columnId:'a',title:'Learn',description:''}]}}]});
test('published checklist, Boolean cells and K-board cards have private overrides without changing source data',()=>{
  const base=fixture();let state=recordInteraction(base,{},'todo',{kind:'checklist',index:0,checked:true});state=recordInteraction(base,state,'table',{kind:'boolean',index:0,columnId:'done',checked:true});state=recordInteraction(base,state,'k',{kind:'kanban',kanban:{cards:[{id:'c',columnId:'b',title:'Practised',description:'Done'}]}});
  const rendered=applyViewerProgress(base,state);assert(rendered.blocks[0].html.includes('data-checked="true"'));assert.equal(rendered.blocks[1].table.rows[0][1],'true');assert.equal(rendered.blocks[2].kanban.cards[0].columnId,'b');assert.equal(base.blocks[1].table.rows[0][1],'false');assert.equal(base.blocks[2].kanban.cards[0].columnId,'a');assert(base.blocks[0].html.includes('data-checked="false"'));
  state=recordInteraction(base,state,'todo',{kind:'checklist',index:0,checked:false});assert(applyViewerProgress(base,state).blocks[0].html.includes('data-checked="false"'));
});
test('changed publication content cannot receive stale checklist or K-board state',()=>{
  const base=fixture(),state=recordInteraction(base,{},'todo',{kind:'checklist',index:0,checked:true}),updated=fixture();updated.blocks[0].html=updated.blocks[0].html.replace('Read','Different task');assert.equal(applyViewerProgress(updated,state).blocks[0].html,updated.blocks[0].html);
  assert.throws(()=>recordInteraction(base,{},'table',{kind:'boolean',index:0,columnId:'name',checked:true}));assert.throws(()=>recordInteraction(base,{},'k',{kind:'kanban',kanban:{cards:[{id:'x',columnId:'invalid',title:'No'}]}}));
});
test('checklist state in text tabs and live working data updates only the requested fields',()=>{
  const base=fixture();base.blocks.push({id:'tabs',type:'tabs',tabs:[{id:'first',html:base.blocks[0].html},{id:'second',html:'<p>Unchanged</p>'}]});const state=recordInteraction(base,{},'tabs',{kind:'checklist',tabId:'first',index:0,checked:true}),view=applyViewerProgress(base,state);assert(view.blocks[3].tabs[0].html.includes('data-checked="true"'));assert.equal(view.blocks[3].tabs[1].html,'<p>Unchanged</p>');assert.equal(applyLiveInteraction(base,'table',{kind:'boolean',index:0,columnId:'done',checked:true}).blocks[1].table.rows[0][1],'true');
});
test('anonymous progress, signed-in draft progress and K-board column widths use separate local-storage scopes',()=>{
  const store=storage(),state={version:1,blocks:{}};assert(cacheProgress('pub',null,state,false,store));assert(readCachedProgress('pub',null,store));assert.equal(readCachedProgress('pub','person',store),null);cacheProgress('pub','person',state,true,store);assert.equal(readCachedProgress('pub','person',store).pending,true);
  saveColumnWidths('owner/project/k',{a:360},store);assert.equal(readColumnWidths('owner/project/k',store).a,360);assert.deepEqual(readColumnWidths('other/k',store),{});assert.equal(kanbanColumnWidth({width:10}),180);assert.equal(kanbanColumnWidth({width:900}),640);
});

test('author default column widths do not reset private K-board progress',()=>{const base=fixture(),state=recordInteraction(base,{},'k',{kind:'kanban',kanban:{cards:[{id:'c',columnId:'b',title:'Learn',description:''}]}}),updated=fixture();updated.blocks[2].kanban.columns[0].width=360;const applied=applyViewerProgress(updated,state);assert.equal(applied.blocks[2].kanban.cards[0].columnId,'b');assert.equal(applied.blocks[2].kanban.columns[0].width,360);});
