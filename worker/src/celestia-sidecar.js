const cleanBase=value=>String(value||'').trim().replace(/\/+$/,'');
const ALLOWED={
  '/v1/capabilities':['GET'],
  '/v1/constants':['GET'],
  '/v1/photometry':['POST'],
  '/v1/equatorial':['POST'],
  '/v1/anomaly':['POST'],
  '/v1/obliquity':['POST']
};

export function celestiaSidecarStatus(env){
  const url=cleanBase(env.CELESTIA_SIDECAR_URL),token=String(env.CELESTIA_SIDECAR_TOKEN||'').trim();
  return{configured:Boolean(url&&token),urlConfigured:Boolean(url),tokenConfigured:Boolean(token)};
}

async function call(env,path,{method='GET',body=null,timeoutMs=2500}={}){
  const status=celestiaSidecarStatus(env);if(!status.configured)throw new Error('celestia_sidecar_not_configured');
  if(!ALLOWED[path]?.includes(method))throw new Error('celestia_sidecar_route_not_allowed');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort('timeout'),timeoutMs);
  try{
    const response=await fetch(`${cleanBase(env.CELESTIA_SIDECAR_URL)}${path}`,{method,headers:{Authorization:`Bearer ${env.CELESTIA_SIDECAR_TOKEN}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
    const text=await response.text();let parsed=null;try{parsed=text?JSON.parse(text):null;}catch{parsed={raw:text.slice(0,500)};}
    if(!response.ok)throw new Error(`celestia_sidecar_http_${response.status}:${text.slice(0,240)}`);
    return parsed;
  }finally{clearTimeout(timer);}
}

export async function celestiaHealth(env){
  const status=celestiaSidecarStatus(env);if(!status.configured)return{ok:false,...status,error:'not_configured'};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort('timeout'),1500);
  try{
    const response=await fetch(`${cleanBase(env.CELESTIA_SIDECAR_URL)}/health`,{headers:{Accept:'application/json'},signal:controller.signal});
    const body=await response.json().catch(()=>null);return{ok:Boolean(response.ok&&body?.ok),...status,sidecar:body||null};
  }catch(error){return{ok:false,...status,error:String(error?.message||error)};}finally{clearTimeout(timer);}
}

export function celestiaCapabilities(env){return call(env,'/v1/capabilities');}
export function celestiaConstants(env){return call(env,'/v1/constants');}
export function celestiaPhotometry(env,payload){return call(env,'/v1/photometry',{method:'POST',body:payload});}
export function celestiaEquatorial(env,payload){return call(env,'/v1/equatorial',{method:'POST',body:payload});}
export function celestiaAnomaly(env,payload){return call(env,'/v1/anomaly',{method:'POST',body:payload});}
export function celestiaObliquity(env,payload){return call(env,'/v1/obliquity',{method:'POST',body:payload});}
