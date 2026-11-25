const validZoom=value=>Number.isFinite(value)&&value>=0.15&&value<=3;
const storageKey=key=>`maiboard-project-zoom:${key}`;
export function readProjectZoom(key,storage=globalThis.localStorage){
  if(!key)return null;
  try{const value=Number(storage?.getItem(storageKey(key)));return validZoom(value)?value:null;}catch{return null;}
}
export function rememberProjectZoom(key,zoom,storage=globalThis.localStorage){
  if(!key||!validZoom(zoom))return;
  try{storage?.setItem(storageKey(key),String(zoom));}catch{}
}
export function cameraForView(blocks,rect,zoom=null,maxFit=1.15){
  const preserved=validZoom(zoom)?zoom:null;
  if(!blocks.length)return {x:0,y:0,z:preserved??1};
  const minX=Math.min(...blocks.map(b=>b.x)),minY=Math.min(...blocks.map(b=>b.y));
  const width=Math.max(1,Math.max(...blocks.map(b=>b.x+b.w))-minX);
  const height=Math.max(1,Math.max(...blocks.map(b=>b.y+(b.h||260)))-minY);
  const z=preserved??Math.max(0.15,Math.min(maxFit,(rect.width-80)/width,(rect.height-140)/height));
  return {x:(rect.width-width*z)/2-minX*z,y:(rect.height-80-height*z)/2-minY*z,z};
}
