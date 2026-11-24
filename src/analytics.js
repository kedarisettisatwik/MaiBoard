import { numeric } from './model.js';
import {isoDate} from './tableFeatures.js';
export const cardMetrics={max:'Maximum',min:'Minimum',average:'Average',sum:'Sum',count:'Record count',rangeCount:'Count in range',distinct:'Distinct values',filledPercent:'Filled percentage',dateCount:'Count dates in range'};
export function reportCardData(report,blocks){
  const source=blocks.find(b=>b.type==='table'&&b.id===report.tableId);
  if(!source)return {reason:'Choose a source table in Properties.'};
  const metric=report.metric||'max',index=source.table.columns.findIndex(c=>c.id===report.valueColumn);
  if(metric==='count')return {value:source.table.rows.length,label:cardMetrics[metric],source:source.name,skipped:0};
  if(index<0)return {reason:'Choose a column in Properties.'};
  if(metric==='filledPercent'){const filled=source.table.rows.filter(row=>String(row[index]??'').trim()!=='').length;return {value:source.table.rows.length?filled/source.table.rows.length*100:0,percent:true,source:source.name,column:source.table.columns[index].name};}
  if(metric==='dateCount'){const from=isoDate(report.dateFrom),to=isoDate(report.dateTo);if(!from||!to||from>to)return {reason:'Choose a valid start and end date.'};const dates=source.table.rows.map(row=>isoDate(row[index])).filter(Boolean);return {value:dates.filter(d=>d>=from&&d<=to).length,source:source.name,column:source.table.columns[index].name,skipped:source.table.rows.length-dates.length};}
  if(metric==='distinct')return {value:new Set(source.table.rows.map(row=>String(row[index]??'').trim()).filter(Boolean)).size,label:cardMetrics[metric],source:source.name,skipped:0};
  const values=source.table.rows.map(row=>numeric(row[index])).filter(v=>v!==null),skipped=source.table.rows.length-values.length;
  let value;
  if(metric==='rangeCount'){
    const low=numeric(report.rangeMin),high=numeric(report.rangeMax);
    if(low===null||high===null||low>high)return {reason:'Enter a valid minimum and maximum range.'};
    value=values.filter(v=>(report.includeMin!==false?v>=low:v>low)&&(report.includeMax!==false?v<=high:v<high)).length;
  }else{
    if(!values.length)return {reason:'No numeric values in this column.'};
    if(metric==='max')value=values.reduce((a,b)=>Math.max(a,b),-Infinity);
    else if(metric==='min')value=values.reduce((a,b)=>Math.min(a,b),Infinity);
    else if(metric==='sum'||metric==='average'){value=values.reduce((a,b)=>a+b,0);if(metric==='average')value/=values.length;}
    else return {reason:'Choose a calculation in Properties.'};
  }
  if(!Number.isFinite(value))return {reason:'The result is outside the supported numeric range.'};
  return {value,label:cardMetrics[metric],column:source.table.columns[index].name,source:source.name,skipped};
}
