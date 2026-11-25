import React,{useEffect,useRef,useState} from 'react';
import {auth,acquireEditor,renewEditor,releaseEditor,watchEditor,updateSharing,getProjectSharing} from './firebase';
import {sharingSettings} from './collaboration';
import {Modal,Field,ErrorMessage,Spinner,Logo} from './ui';

export function SharingFields({value,onChange,editors=false,locked=false}) {
  return <><Field label="Who can open the published link?"><select disabled={locked} value={value.audience} onChange={e=>onChange({...value,audience:e.target.value})}><option value="public">Public — anyone with the link</option><option value="emails">Specific emails — sign in required</option><option value="users">All MaiBoard users — sign in required</option></select></Field>{value.audience==='emails'&&<Field label="Viewer emails" hint="Separate addresses with commas. Recipients sign in with an allowed email."><textarea value={Array.isArray(value.viewerEmails)?value.viewerEmails.join(', '):value.viewerEmails} onChange={e=>onChange({...value,viewerEmails:e.target.value})}/></Field>}{editors&&<Field label="Editor emails" hint="Editors can change the entire project. One editor can work at a time."><textarea value={Array.isArray(value.editorEmails)?value.editorEmails.join(', '):value.editorEmails} onChange={e=>onChange({...value,editorEmails:e.target.value})}/></Field>}</>;
}
export function NewProjectModal({board,onCreate,onClose}) {
  const [name,setName]=useState(board?.name||'Untitled'),[sharing,setSharing]=useState(sharingSettings()),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <Modal title="Create project" onClose={()=>!busy&&onClose()}><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await onCreate({...board,name:name.trim()||'Untitled'},sharingSettings(sharing));}catch(e){setError(e.message);}finally{setBusy(false);}}}><Field label="Project name"><input autoFocus value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></Field><SharingFields value={sharing} onChange={setSharing}/><ErrorMessage>{error}</ErrorMessage><div className="modal-actions"><button className="btn" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="btn primary" disabled={busy}>{busy?'Creating…':'Create project'}</button></div></form></Modal>;
}
export function SharingModal({ownerUid,id,onClose,onSaved}) {
  const [value,setValue]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{getProjectSharing(ownerUid,id).then(setValue).catch(e=>setError(e.message));},[ownerUid,id]);
  return <Modal title="Project sharing" onClose={()=>!busy&&onClose()}>{value?<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const sharing=await updateSharing(ownerUid,id,value);onSaved?.(sharing);onClose();}catch(e){setError(e.message);}finally{setBusy(false);}}}><SharingFields value={value} onChange={setValue} editors locked/><p className="property-hint">Project type is fixed at creation. You can update invited emails.</p><p className="muted">Invitation changes apply to the current published link immediately. Editors receive access under Shared after signing in with their email.</p><ErrorMessage>{error}</ErrorMessage><button className="btn primary" disabled={busy}>{busy?'Saving…':'Save sharing'}</button></form>:<><ErrorMessage>{error}</ErrorMessage>{!error&&<Spinner/>}</>}</Modal>;
}
export function EditorSession({ownerUid,id,user,children,onExit}){
  const lifecycle=useRef(Promise.resolve()),session=useRef(crypto.randomUUID()),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true,timer,stop;
    const sessionId=crypto.randomUUID();session.current=sessionId;
    setReady(false);setError('');
    const start=lifecycle.current.catch(()=>{}).then(()=>acquireEditor(ownerUid,id,sessionId)).then(()=>{
      if(!active){releaseEditor(ownerUid,id,sessionId).catch(()=>{});return;}
      setReady(true);
      stop=watchEditor(ownerUid,id,lease=>{if(!lease||lease.sessionId!==sessionId){setReady(false);setError('The editing session ended. Reopen the project to continue.');}},e=>{setReady(false);setError(e.message);});
      timer=setInterval(()=>renewEditor(ownerUid,id,sessionId).catch(e=>{setReady(false);setError(e.message);}),25000);
    }).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;clearInterval(timer);stop?.();lifecycle.current=start.then(()=>releaseEditor(ownerUid,id,sessionId)).catch(()=>{});};
  },[ownerUid,id,user.uid,attempt]);
  return ready?children(session.current):<div className="load-error"><Logo/><h1>{error?'Project is not ready to edit':'Opening editing session…'}</h1>{error?<><ErrorMessage>{error}</ErrorMessage><p>When an editor closes their tab, its lock expires within 90 seconds.</p><div className="modal-actions"><button className="btn" onClick={onExit}>Back to projects</button><button className="btn primary" onClick={()=>setAttempt(x=>x+1)}>Try again</button></div></>:<Spinner/>}</div>;
}

export function TeamTableProperties({block,update}){
  const t=block.table,personal=t.personal||{enabled:false,mode:'email'},set=patch=>update({table:{...t,...patch}});
  return <section className="property-section"><h3>Team & personal data</h3><label><input type="checkbox" checked={t.audit===true} disabled={t.teamAdd===true} onChange={e=>{if(e.target.checked)set({audit:true});else{const keep=t.columns.map(c=>!c.system);set({audit:false,columns:t.columns.filter((_,i)=>keep[i]),rows:t.rows.map(row=>row.filter((_,i)=>keep[i]))});}}}/> Created by / Created on columns</label><label><input type="checkbox" checked={t.teamAdd===true} onChange={e=>set({teamAdd:e.target.checked,audit:e.target.checked||t.audit})}/> Team members can add rows</label><label><input type="checkbox" checked={t.teamDeleteOwn===true} onChange={e=>set({teamDeleteOwn:e.target.checked})}/> Members can delete their own rows</label><p className="property-hint">Team submissions require a Specific emails audience and sign-in. Editors can manage all rows.</p><label><input type="checkbox" checked={personal.enabled===true} onChange={e=>set({personal:{...personal,enabled:e.target.checked}})}/> Each viewer sees only their own rows</label>{personal.enabled&&<><Field label="Identity column"><select value={personal.columnId||''} onChange={e=>set({personal:{...personal,columnId:e.target.value}})}><option value="">Choose column</option>{t.columns.filter(c=>!c.system).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Match identity using"><select value={personal.mode||'email'} onChange={e=>set({personal:{...personal,mode:e.target.value}})}><option value="email">Column contains recipient email</option><option value="mapping">Map recipient email to column value</option></select></Field>{personal.mode==='mapping'&&<IdentityMapping value={personal.mapping||[]} onChange={mapping=>set({personal:{...personal,mapping}})}/>}<p className="property-hint">Publish with a signed-in audience. Firestore restricts rows before download; every report uses those same rows. Identity filters cannot be changed by viewers.</p></>}</section>;
}
function IdentityMapping({value,onChange}){
  return <div><p className="property-hint">Email → exact column value (for example a name)</p>{value.map((m,i)=><div className="identity-mapping" key={i}><input aria-label="Recipient email" placeholder="person@company.com" value={m.email} onChange={e=>onChange(value.map((x,j)=>j===i?{...x,email:e.target.value}:x))}/><input aria-label="Identity value" placeholder="Name in CSV" value={m.value} onChange={e=>onChange(value.map((x,j)=>j===i?{...x,value:e.target.value}:x))}/><button className="text-button" onClick={()=>onChange(value.filter((_,j)=>j!==i))}>Remove</button></div>)}<button className="btn" onClick={()=>onChange([...value,{email:'',value:''}])}>Add mapping</button></div>;
}
