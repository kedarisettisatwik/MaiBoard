import {blankBoard,newBlock,uid} from './model.js';
export const sampleProjects=[
  {id:'reporting',name:'Table report',icon:'BarChart3',description:'Sales data, linked charts, and report cards for totals, averages and ranges.'},
  {id:'onboarding',name:'Employee onboarding',icon:'PanelsTopLeft',description:'A guided welcome, first-day checklist, and first-week plan across tabs.'},
  {id:'delivery',name:'Team delivery',icon:'Columns3',description:'A Kanban board, workload report, and a simple team working agreement.'},
  {id:'budget',name:'Budget overview',icon:'Table2',description:'Track planned and actual spending with category charts and summary cards.'},
];
export function createSample(id){
  const meta=sampleProjects.find(x=>x.id===id);if(!meta)throw Error('Unknown sample project');
  const board=blankBoard(meta.name),add=(type,name,x,y,w,h)=>{const b=newBlock(type,x,y);Object.assign(b,{name,viewId:'view-1',...(w?{w}:{}),...(h?{h}:{})});board.blocks.push(b);return b;};
  const note=(title,html,x,y,w=380,h=230)=>{const b=add('text',title,x,y,w,h);b.html=html;return b;};
  const report=(table,kind,title,x,y,metric)=>{const b=add('report',title,x,y,kind==='card'?250:470,kind==='card'?195:350);b.report={...b.report,sourceType:'table',tableId:table.id,labelColumn:table.table.columns[0].id,valueColumn:table.table.columns[1].id,kind,metric:metric||'max',rangeMin:'100',rangeMax:'300',decimals:0};return b;};
  if(id==='reporting'||id==='budget'){
    const budget=id==='budget';note(budget?'Spend with clarity':'Sales at a glance',`<h2>${budget?'Budget overview':'Sales performance'}</h2><p>${budget?'Compare spending across teams. Edit the table to see every summary update.':'A live dashboard built from one table. Change any amount to update the cards and charts.'}</p>`,60,40,1000,160);
    const table=add('table',budget?'Department spending':'Quarterly sales',60,445,530,360);
    table.table={columns:[{id:uid(),name:budget?'Department':'Channel'},{id:uid(),name:budget?'Actual spend':'Revenue'},{id:uid(),name:budget?'Planned spend':'Orders'}],rows:budget?[['Product','12000','15000'],['Marketing','8500','10000'],['Operations','6400','7000'],['Support','4200','5000']]:[['Organic','240','18'],['Direct','420','32'],['Social','180','14'],['Email','320','25'],['Partner','100','8']]};
    report(table,'card','Total',60,225,'sum');report(table,'card','Average',335,225,'average');report(table,'card','Highest',610,225,'max');const range=report(table,'card',budget?'Departments in range':'Sales between 100 and 300',885,225,'rangeCount');if(budget){range.report.rangeMin='5000';range.report.rangeMax='10000';}
    report(table,'pie',budget?'Spend by department':'Revenue by channel',625,445);report(table,'bar',budget?'Department comparison':'Channel comparison',60,845);report(table,'histogram',budget?'Spending distribution':'Revenue distribution',625,845);
  }else if(id==='onboarding'){
    const tabs=add('tabs','Your onboarding journey',60,60,1100,650);
    tabs.tabs=['Welcome','Day one','First week'].map(name=>({id:uid(),name,contentType:'blocks',html:''}));tabs.activeTab=tabs.tabs[0].id;tabs.tabLayout='horizontal';tabs.tabHighlight='pill';
    const content=[['Welcome aboard','<h2>Welcome to Northstar</h2><p>Your first week starts here. Meet your buddy, explore the company handbook, and settle in.</p><ul><li>Buddy: Alex, People team</li><li>Team stand-up: 9:30 AM</li><li>Ask questions in the welcome channel</li></ul>'],['Your first day','<h2>Get ready to work</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Set up your laptop and company email</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Meet your manager and buddy</p></div></li></ul>'],['Your first week','<h2>Find your rhythm</h2><ol><li>Meet the teams you will work with.</li><li>Review your role and first-month goals.</li><li>Complete a small starter task.</li><li>Book a Friday check-in with your manager.</li></ol>']];
    content.forEach(([title,html],i)=>{const text=note(title,html,30,25,660,345);text.tabParentId=tabs.id;text.tabId=tabs.tabs[i].id;const extra=note('Helpful reminder','<h3>You are not expected to know everything.</h3><p>Write down questions and bring them to your buddy check-in.</p>',720,25,280,300);extra.tabParentId=tabs.id;extra.tabId=tabs.tabs[i].id;if(i<2){const button=add('button','Continue onboarding',30,400,240,48);button.tabParentId=tabs.id;button.tabId=tabs.tabs[i].id;button.link={label:i===0?'Start day one':'Continue to first week',action:'tab',targetTabBlockId:tabs.id,targetTabId:tabs.tabs[i+1].id};}});
  }else{
    note('Working together','<h2>Team delivery board</h2><p>Move cards as work progresses. The report counts cards in each column automatically.</p>',60,45,1080,160);
    const k=add('kanban','This week',60,240,850,500);k.kanban.cards=[{id:uid(),title:'Define launch checklist',description:'Agree on owners and dates.',columnId:k.kanban.columns[0].id},{id:uid(),title:'Prepare customer guide',description:'Draft the first version.',columnId:k.kanban.columns[1].id},{id:uid(),title:'Review support handover',description:'Confirm escalation contacts.',columnId:k.kanban.columns[1].id}];const chart=add('report','Work by status',950,240,440,350);chart.report={kind:'pie',sourceType:'kanban',kanbanId:k.id};note('Team agreement','<h3>Keep the work visible</h3><ul><li>Choose one priority each morning.</li><li>Flag blockers early.</li><li>Review completed work on Friday.</li></ul>',950,625,440,240);
  }
  return board;
}
