const taskTag=tag=>/\bdata-type\s*=\s*(["'])taskItem\1/i.test(tag);
export function checklistHtml(html,checks={}){
  let index=0;
  return String(html||'').replace(/<li\b[^>]*>/gi,tag=>{
    if(!taskTag(tag))return tag;
    const value=checks[index++];if(typeof value!=='boolean')return tag;
    return /\bdata-checked\s*=/i.test(tag)?tag.replace(/\bdata-checked\s*=\s*(["'])[^"']*\1/i,`data-checked="${value}"`):tag.replace(/>$/,` data-checked="${value}">`);
  });
}
function signature(block){
  const cleanChecks=value=>String(value||'').replace(/\bdata-checked\s*=\s*(["'])[^"']*\1/gi,'data-checked="false"');
  const content=JSON.stringify(block.type==='text'?cleanChecks(block.html):block.type==='tabs'?block.tabs.map(t=>[t.id,cleanChecks(t.html)]):block.type==='table'?[block.table.columns.map(c=>[c.id,c.type]),block.table.rows.map(r=>r.map((v,i)=>block.table.columns[i]?.type==='boolean'?null:v))]:block.kanban?{columns:block.kanban.columns.map(c=>[c.id,c.name]),cards:block.kanban.cards.map(c=>[c.id,c.columnId,c.title,c.description])}:null);
  let hash=2166136261;for(let i=0;i<content.length;i++)hash=Math.imul(hash^content.charCodeAt(i),16777619);
  return (hash>>>0).toString(36);
}
function validCards(block,cards){
  if(!Array.isArray(cards)||cards.length>2000)throw Error('Use at most 2,000 K-board cards.');
  const ids=new Set();return cards.map(c=>{
    if(!c||typeof c.id!=='string'||c.id.length>100||ids.has(c.id)||!block.kanban.columns.some(x=>x.id===c.columnId)||typeof c.title!=='string'||c.title.length>150||String(c.description||'').length>2000)throw Error('Invalid K-board card.');
    ids.add(c.id);return {id:c.id,columnId:c.columnId,title:c.title,description:String(c.description||'')};
  });
}
export function recordInteraction(base,state,id,action){
  const block=base.blocks.find(b=>b.id===id);if(!block)throw Error('This block no longer exists.');
  const stamp=signature(block),old=state?.blocks?.[id];
  const entry=old?.signature===stamp?structuredClone(old):{signature:stamp};
  if(action.kind==='checklist'){
    const target=action.tabId?block.tabs?.find(t=>t.id===action.tabId):block;
    if(!target||typeof target.html!=='string'||!Number.isInteger(action.index)||action.index<0||action.index>5000||typeof action.checked!=='boolean')throw Error('Invalid checklist action.');
    entry.tasks||={};entry.tasks[action.tabId||'main']={...entry.tasks[action.tabId||'main'],[action.index]:action.checked};
  }else if(action.kind==='boolean'){
    const column=block.table?.columns.find(c=>c.id===action.columnId);
    if(column?.type!=='boolean'||!Number.isInteger(action.index)||!block.table.rows[action.index]||typeof action.checked!=='boolean')throw Error('This is not a Boolean table field.');
    entry.booleans||={};entry.booleans[action.index]={...entry.booleans[action.index],[action.columnId]:action.checked};
  }else if(action.kind==='kanban'){
    if(block.type!=='kanban')throw Error('This is not a K board.');entry.cards=validCards(block,action.kanban?.cards);
  }else throw Error('Unsupported interaction.');
  const next={version:1,blocks:{...state?.blocks,[id]:entry}};
  if(new TextEncoder().encode(JSON.stringify(next)).length>750000)throw Error('Your saved progress is larger than 750 KB.');
  return next;
}
export function applyViewerProgress(base,state,predicate=()=>true){
  return {...base,blocks:base.blocks.map(block=>{
    const entry=state?.blocks?.[block.id];if(!entry||!predicate(block)||entry.signature!==signature(block))return block;
    if(block.type==='text')return {...block,html:checklistHtml(block.html,entry.tasks?.main)};
    if(block.type==='tabs')return {...block,tabs:block.tabs.map(t=>({...t,html:checklistHtml(t.html,entry.tasks?.[t.id])}))};
    if(block.type==='table')return {...block,table:{...block.table,rows:block.table.rows.map((row,i)=>row.map((v,j)=>block.table.columns[j]?.type==='boolean'&&typeof entry.booleans?.[i]?.[block.table.columns[j].id]==='boolean'?String(entry.booleans[i][block.table.columns[j].id]):v))}};
    if(block.type==='kanban'&&entry.cards){try{return {...block,kanban:{...block.kanban,cards:validCards(block,entry.cards)}};}catch{return block;}}
    return block;
  })};
}
export function applyLiveInteraction(board,id,action){
  return applyViewerProgress(board,recordInteraction(board,{},id,action));
}
const cacheKey=(publicationId,uid)=>`maiboard-progress:${uid||'guest'}:${publicationId}`;
export function readCachedProgress(publicationId,uid,storage=globalThis.localStorage){
  try{const value=JSON.parse(storage?.getItem(cacheKey(publicationId,uid))||'null');return value?.state?.version===1?value:null;}catch{return null;}
}
export function cacheProgress(publicationId,uid,state,pending=false,storage=globalThis.localStorage){
  try{storage?.setItem(cacheKey(publicationId,uid),JSON.stringify({state,pending}));return true;}catch{return false;}
}
export function kanbanColumnWidth(column,defaultWidth=245){return Math.max(180,Math.min(640,Math.round(Number(column.width)||defaultWidth)));}
export function readColumnWidths(key,storage=globalThis.localStorage){try{const value=JSON.parse(storage?.getItem(`maiboard-kanban-widths:${key}`)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
export function saveColumnWidths(key,widths,storage=globalThis.localStorage){try{storage?.setItem(`maiboard-kanban-widths:${key}`,JSON.stringify(widths));return true;}catch{return false;}}
