import test from 'node:test';
import assert from 'node:assert/strict';
import {chartColor,chartPalettes} from '../src/chartColors.js';
import {newBlock,publishSnapshot,isBackgroundColor} from '../src/model.js';

test('Category colors follow labels when data order changes and survive publication',()=>{
  const report=newBlock('report');
  report.report={...report.report,palette:'Vibrant',colors:{Organic:'#ff0066'}};
  assert.equal(chartColor(report.report,'Organic',0),'#ff0066');
  assert.equal(chartColor(report.report,'Organic',3),'#ff0066');
  assert.equal(chartColor(report.report,'Direct',1),chartPalettes.Vibrant[1]);
  const published=publishSnapshot({blocks:[report],edges:[]});
  assert.equal(chartColor(published.blocks[0].report,'Organic',2),'#ff0066');
  assert.equal(chartColor({palette:'missing',colors:{Organic:'url(bad)'}},'Organic',0),chartPalettes.Blue[0]);
});
test('Background colors accept transparent and custom hex without arbitrary CSS',()=>{
  for(const value of ['transparent','#abc','#abcdef','#abcdef80'])assert.equal(isBackgroundColor(value),true);
  for(const value of ['url(https://example.com)','red','#oops'])assert.equal(isBackgroundColor(value),false);
});
