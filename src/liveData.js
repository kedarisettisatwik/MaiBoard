import {withAudit} from './collaboration.js';
import {validCell} from './tableFeatures.js';

// Live mode changes table records only. Column/schema/layout updates remain in
// the full editor; row ownership metadata is kept aligned through deletions.
export function updateLiveTable(board,id,table,user){
  const block=board.blocks.find(b=>b.id===id&&b.type==='table');
  if(!block)throw Error('This table no longer exists.');
  const columns=block.table.columns;
  if(!Array.isArray(table.columns)||table.columns.length!==columns.length||table.columns.some((c,i)=>c.id!==columns[i].id))throw Error('Table columns changed. Reload Live mode.');
  if(!Array.isArray(table.rows)||table.rows.length>5000)throw Error('A table supports up to 5,000 rows.');
  const rows=table.rows.map(row=>{
    if(!Array.isArray(row)||row.length!==columns.length)throw Error('Each row must match the table columns.');
    return row.map((value,i)=>{
      if(typeof value!=='string'||value.length>10000)throw Error('Each cell must contain at most 10,000 characters.');
      if(!validCell(columns[i],value))throw Error('Choose an existing option for a restricted dropdown.');
      return value;
    });
  });
  const next=withAudit({...block,table:{...block.table,rows,rowMeta:rows.map((_,i)=>table.rowMeta?.[i]||null)}},user);
  return {...board,blocks:board.blocks.map(b=>b.id===id?next:next.table.entityKey&&b.table?.entityKey===next.table.entityKey?{...b,table:{...b.table,rows:next.table.rows,rowMeta:next.table.rowMeta,columns:next.table.columns}}:b)};
}
