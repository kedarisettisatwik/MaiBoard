import {emailKey} from './collaboration.js';
export function validateEntity(table){
  if(!Array.isArray(table.columns)||!table.columns.length||table.columns.length>50)throw Error('Use between 1 and 50 fields.');
  const ids=new Set();for(const c of table.columns){if(!c.id||ids.has(c.id)||!String(c.name||'').trim())throw Error('Each field needs a name and unique key.');ids.add(c.id);if(!['text','date','number','select','boolean','suggest'].includes(c.type||'text'))throw Error('Unsupported field type.');if(c.type==='select'&&!(c.options||[]).some(x=>x.trim()))throw Error('Picklist fields need options.');}
  if(!Array.isArray(table.rows)||table.rows.length>5000)throw Error('Use at most 5,000 records.');
  for(const row of table.rows){if(row.length!==table.columns.length)throw Error('Records must match the fields.');row.forEach((value,i)=>{const c=table.columns[i],v=String(value??'');if(v.length>10000)throw Error('A field supports at most 10,000 characters.');if(!v)return;if(c.type==='select'&&!(c.options||[]).includes(v))throw Error('Choose an existing picklist option.');if(c.type==='number'&&!Number.isFinite(Number(v)))throw Error('Enter a valid number.');if(c.type==='boolean'&&!['true','false'].includes(v))throw Error('Boolean fields must be true or false.');if(c.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v))throw Error('Enter a valid date.');});}
  return {columns:table.columns.map(c=>{const {hidden,...field}=c;return structuredClone(field);}),rows:table.rows.map(r=>r.map(v=>String(v??''))),rowMeta:table.rowMeta||[]};
}
export function entityTable(table,entity){const data=JSON.parse(entity.dataJson),{entityMissingKey,...settings}=table;return {...settings,columns:data.columns.map(c=>({...c,hidden:table.columns?.find(x=>x.id===c.id)?.hidden===true})),rows:data.rows,rowMeta:data.rowMeta||[],entityKey:entity.id,entityRevision:entity.revision};}
export function stripEntityData(board){const copy=structuredClone(board);for(const b of copy.blocks.filter(b=>b.table?.entityKey)){b.table.rows=[];b.table.rowMeta=[];}return copy;}
export function sectionEmails(board,block,sharing){
  if(sharing.audience!=='emails')return null;
  let allowed=null,current=block;const seen=new Set();
  while(current&&!seen.has(current.id)){seen.add(current.id);if(current.type==='section'&&Array.isArray(current.grantEmails)){const list=current.grantEmails.map(emailKey);allowed=allowed===null?list:allowed.filter(e=>list.includes(e));}current=board.blocks.find(b=>b.id===(current.parentId||current.tabParentId));}
  return allowed;
}
export function recipientBoard(board,email,sharing){const copy=structuredClone(board),key=emailKey(email);const denied=new Set(board.blocks.filter(b=>{const grants=sectionEmails(board,b,sharing);return grants!==null&&!grants.includes(key);}).map(b=>b.id));
  for(const b of board.blocks)if((b.type==='report'&&(denied.has(b.report?.tableId)||denied.has(b.report?.kanbanId)))||(b.type==='filter'&&denied.has(b.filter?.tableId)))denied.add(b.id);
  copy.blocks=copy.blocks.filter(b=>!denied.has(b.id));copy.edges=copy.edges.filter(e=>!denied.has(e.from)&&!denied.has(e.to));return copy;
}
export function downloadTableCSV(block){const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';const text='\ufeff'+[block.table.columns.map(c=>c.name),...block.table.rows].map(r=>r.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=(block.name||'Table')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function missingEntityTable(table,key){const {entityKey,entityRevision,...settings}=table;return {...settings,rows:[],rowMeta:[],entityMissingKey:key};}
