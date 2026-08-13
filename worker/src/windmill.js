const cleanBase=value=>String(value||'').trim().replace(/\/+$/,'');
const cleanPath=value=>String(value||'').trim().replace(/^\/+/, '');

export function windmillStatus(env){
  const base=cleanBase(env.WINDMILL_BASE_URL),workspace=String(env.WINDMILL_WORKSPACE||'').trim(),token=String(env.WINDMILL_TOKEN||'').trim(),validationPath=cleanPath(env.WINDMILL_VALIDATION_FLOW_PATH),agentPath=cleanPath(env.WINDMILL_AGENT_FLOW_PATH);
  return{configured:Boolean(base&&workspace&&token&&(validationPath||agentPath)),baseConfigured:Boolean(base),workspaceConfigured:Boolean(workspace),tokenConfigured:Boolean(token),validationConfigured:Boolean(validationPath),agentConfigured:Boolean(agentPath)};
}

async function invoke(env,path,args,{wait=false}={}){
  const status=windmillStatus(env);if(!status.configured)throw new Error('windmill_not_configured');
  const base=cleanBase(env.WINDMILL_BASE_URL),workspace=encodeURIComponent(String(env.WINDMILL_WORKSPACE).trim()),runnable=cleanPath(path);
  if(!runnable||!/^([ufg])\//.test(runnable))throw new Error('invalid_windmill_path');
  const mode=wait?'run_wait_result':'run';
  const url=`${base}/api/w/${workspace}/jobs/${mode}/p/${runnable}`;
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${env.WINDMILL_TOKEN}`,'Content-Type':'application/json','User-Agent':'URUX-Windmill-Orchestrator/1.0'},body:JSON.stringify(args&&typeof args==='object'?args:{})});
  const text=await response.text();let body=text;try{body=text?JSON.parse(text):null;}catch{}
  if(!response.ok)throw new Error(`windmill_http_${response.status}:${String(text).slice(0,220)}`);
  return{ok:true,mode:wait?'sync':'async',path:runnable,result:body};
}

export function runValidation(env,args={}){return invoke(env,env.WINDMILL_VALIDATION_FLOW_PATH,args,{wait:true});}
export function runAgentWorkflow(env,args={}){return invoke(env,env.WINDMILL_AGENT_FLOW_PATH,args,{wait:false});}
