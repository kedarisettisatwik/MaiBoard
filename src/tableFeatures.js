export function filteredRows(table,filters={}){
  return table.rows.map((row,index)=>({row,index})).filter(({row})=>table.columns.every((c,i)=>{
    const f=filters[c.id];if(!f)return true;const value=String(row[i]??'');
    if(c.type==='date')return (!f.from||value>=f.from)&&(!f.to||value<=f.to)&&(!f.from&&!f.to||!!value);
    return c.type==='select'||c.type==='suggest'?(!f.value||value===f.value):(!f.value||value.toLowerCase().includes(f.value.toLowerCase()));
  }));
}
export function validCell(column,value){return column.type!=='select'||!value||(column.options||[]).includes(value);}
export function isoDate(value){const v=String(value??'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const time=Date.parse(v+'T00:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===v?v:null;}
export function filterTableByBlocks(tableBlock,blocks,values={},reportsOnly=false){
  let rows=tableBlock.table.rows.map((row,index)=>({row,index}));
  for(const block of blocks){const f=block.filter;if(block.type!=='filter'||f?.tableId!==tableBlock.id||block.hidden||(reportsOnly&&f.applyToReports!==true))continue;const c=tableBlock.table.columns.find(c=>c.id===f.columnId),value=values[block.id];if(!c||!value)continue;const type=f.mode==='date'?'date':f.mode==='dropdown'?'select':'text';const allowed=new Set(filteredRows({...tableBlock.table,columns:tableBlock.table.columns.map(x=>x.id===c.id?{...x,type}:x)},{[c.id]:value}).map(x=>x.index));rows=rows.filter(x=>allowed.has(x.index));}
  return rows;
}
