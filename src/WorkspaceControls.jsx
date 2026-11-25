import React,{useEffect,useRef} from 'react';

export function useUnsavedChanges(when,onLeave){
  const current=useRef({when,onLeave});current.current={when,onLeave};
  useEffect(()=>{
    const active=()=>typeof current.current.when==='function'?current.current.when():current.current.when;
    const unload=e=>{if(active()){e.preventDefault();e.returnValue='';}};
    const navigate=e=>{if(active()){e.preventDefault();current.current.onLeave(e.detail.proceed);}};
    addEventListener('beforeunload',unload);addEventListener('maiboard-before-navigate',navigate);
    return()=>{removeEventListener('beforeunload',unload);removeEventListener('maiboard-before-navigate',navigate);};
  },[]);
}
export function ResizeGrip({value,onChange,min=180,max=520,side='right',inline=false,label='Resize panel',reset,scaled=false}){
  const drag=useRef(null);
  const change=value=>onChange(Math.round(Math.max(min,Math.min(max,value))));
  return <div role="separator" tabIndex={0} aria-label={label} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
    className={`resize-grip ${inline?'inline-grip':side+'-grip'}`} title="Drag to resize; use arrow keys for precise adjustment"
    onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const parent=e.currentTarget.parentElement,scale=scaled?parent.getBoundingClientRect().width/parent.offsetWidth:1;drag.current={x:e.clientX,value,scale:scale||1};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{if(!drag.current)return;e.preventDefault();e.stopPropagation();change(drag.current.value+(e.clientX-drag.current.x)/drag.current.scale*(side==='left'?-1:1));}}
    onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
    onPointerCancel={()=>drag.current=null}
    onDoubleClick={()=>reset!==undefined&&change(reset)}
    onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();change(value+(e.key==='ArrowRight'?10:-10)*(side==='left'?-1:1));}}}/>
}
