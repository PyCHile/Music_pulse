const STORAGE_KEY='urux_backend_url';
const DEFAULT_TIMEOUT_MS=15000;
function normalize(url){if(typeof url!=='string')return null;const value=url.trim().replace(/\/$/,'');if(!/^https:\/\//i.test(value))return null;return value;}
export function configureURUXBackendURL(url){const normalized=normalize(url);if(!normalized)throw new Error('URUX backend URL must be a valid https URL.');localStorage.setItem(STORAGE_KEY,normalized);return normalized;}
export function clearURUXBackendURL(){localStorage.removeItem(STORAGE_KEY);}
export function getURUXBackendURL(){return normalize(localStorage.getItem(STORAGE_KEY)||'');}
export class URUXBackendClient{
 constructor(){this.lastStatus=null;this.lastError=null;this.lastModel=null;}
 get configured(){return Boolean(getURUXBackendURL());}
 async health(){const base=getURUXBackendURL();if(!base)return{ok:false,configured:false};const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const r=await fetch(`${base}/health`,{signal:controller.signal,headers:{Accept:'application/json'}});const body=await r.json().catch(()=>({}));this.lastStatus=r.status;return{...body,httpStatus:r.status,configured:true};}catch(error){this.lastError=String(error);return{ok:false,configured:true,error:this.lastError};}finally{clearTimeout(timer);}}
 async encounters(stage){const base=getURUXBackendURL();if(!base)return null;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),DEFAULT_TIMEOUT_MS);try{const r=await fetch(`${base}/v1/encounters`,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({stage})});this.lastStatus=r.status;if(r.status===429){const retryAfter=Number(r.headers.get('Retry-After'))||20;const error=new Error('rate_limited');error.retryAfter=retryAfter;throw error;}if(!r.ok)throw new Error(`backend:${r.status}`);const body=await r.json();this.lastModel=body.model||null;this.lastError=null;return body;}catch(error){this.lastError=String(error);throw error;}finally{clearTimeout(timer);}}
}
