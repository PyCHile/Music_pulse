import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';

const BASE='./assets/astronomy/';
const MANIFEST_URL=`${BASE}manifest.json`;
const DEFAULT_BACKEND='https://music-pulse.habidomix.workers.dev';

function backendURL(){
  try{return (localStorage.getItem('urux_backend_url')||DEFAULT_BACKEND).replace(/\/$/,'');}
  catch{return DEFAULT_BACKEND;}
}

async function fetchJson(url,required=false){
  try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok){if(required)throw new Error(`${url}_http_${r.status}`);return null;}return await r.json();}
  catch(error){if(required)throw error;return null;}
}

export class ScientificAstronomyRuntime{
  constructor(){
    this.manifest=null;this.gaia=null;this.horizons=null;this.celestiaLive=null;this.ready=false;this.failed=false;
    this.stats={ready:false,pending:true,stars:0,bodies:0,gaia:false,horizons:false,skyview:false,wcs:false,reproject:false,aplpy:false,spectralCube:false,celestiaBuild:false,celestiaRuntime:false,lastError:null};
    this.readyPromise=this.load();
  }
  async load(){
    try{
      const [manifest,celestiaLive]=await Promise.all([
        fetchJson(MANIFEST_URL,true),
        fetchJson(`${backendURL()}/diagnostics/celestia`)
      ]);
      this.manifest=manifest;this.celestiaLive=celestiaLive;
      const caps=this.manifest?.capabilities||{};
      if(caps['astroquery.gaia'])this.gaia=await fetchJson(`${BASE}gaia-dr3.json`);
      if(caps['astroquery.jplhorizons'])this.horizons=await fetchJson(`${BASE}jpl-earth-vector.json`);
      const generated=Boolean(this.manifest?.generatedAt&&!this.manifest?.pendingPipeline);
      const gaia=Boolean(caps['astroquery.gaia']&&this.gaia?.records?.length);
      const horizons=Boolean(caps['astroquery.jplhorizons']&&this.horizons?.records?.length);
      const skyview=Boolean(caps['astroquery.skyview']);
      const wcs=Boolean(caps['astropy.wcsaxes']&&caps['astropy.visualization']);
      const reprojection=Boolean(caps['reproject.interp']&&caps['reproject.adaptive']&&caps['reproject.exact']);
      const aplpyReady=Boolean(caps.aplpy);
      const spectral=Boolean(caps['spectral-cube']);
      const celestiaRuntime=Boolean(celestiaLive?.ok&&celestiaLive?.connected&&celestiaLive?.native);
      const celestiaBuild=Boolean(celestiaRuntime||celestiaLive?.compiledSubsystems?.length);
      this.ready=true;
      this.stats={ready:true,pending:!generated,stars:this.gaia?.records?.length||0,bodies:this.horizons?.records?.length||0,gaia,horizons,skyview,wcs,reproject:reprojection,aplpy:aplpyReady,spectralCube:spectral,celestiaBuild,celestiaRuntime,lastError:null};

      runtimeCapabilities.mark('astropy-stack',generated,{libraries:this.manifest?.libraries||{},generatedAt:this.manifest?.generatedAt||null,provenance:this.manifest?.provenance||[]});
      runtimeCapabilities.mark('astroquery',Boolean(caps['astroquery.simbad']||gaia||horizons||skyview),{simbad:Boolean(caps['astroquery.simbad']),gaia,horizons,skyview});
      runtimeCapabilities.mark('gaia-catalog',gaia,{count:this.stats.stars,source:'ESA Gaia DR3'});
      runtimeCapabilities.mark('nasa-jpl-catalog',horizons,{count:this.stats.bodies,source:'NASA/JPL Horizons'});
      runtimeCapabilities.mark('wcs-science',wcs,{wcsAxes:Boolean(caps['astropy.wcsaxes']),visualization:Boolean(caps['astropy.visualization'])});
      runtimeCapabilities.mark('reproject',reprojection,{interp:Boolean(caps['reproject.interp']),adaptive:Boolean(caps['reproject.adaptive']),exact:Boolean(caps['reproject.exact'])});
      runtimeCapabilities.mark('aplpy',aplpyReady,{source:'generated FITS visualization'});
      runtimeCapabilities.mark('spectral-cube',spectral,{source:'observational HI4PI reduced FITS cube'});
      runtimeCapabilities.mark('celestia-native-build',celestiaBuild,{live:celestiaLive||null});
      runtimeCapabilities.mark('celestia-literal',celestiaRuntime,celestiaRuntime?{
        transport:celestiaLive.transport,
        version:celestiaLive.celestia,
        compiledSubsystems:celestiaLive.compiledSubsystems||[],
        content:celestiaLive.content||null,
        libraryProbe:celestiaLive.libraryProbe||null,
        renderLoop:false
      }:{reason:'native sidecar did not answer /diagnostics/celestia'});
      return true;
    }catch(error){
      this.failed=true;this.stats.lastError=String(error);
      runtimeCapabilities.mark('astropy-stack',false,{error:String(error)});
      runtimeCapabilities.mark('celestia-literal',false,{error:String(error)});
      return false;
    }
  }
  stars(limit=256){return (this.gaia?.records||[]).slice(0,limit);}
  bodies(){return this.horizons?.records||[];}
  body(name){const n=String(name||'').toLowerCase();return this.bodies().find(b=>String(b.targetname||b.name||'').toLowerCase().includes(n))||null;}
  get epoch(){return this.horizons?.epochTDB||this.manifest?.generatedAt||null;}
  snapshot(){return{...this.stats,epoch:this.epoch,libraries:this.manifest?.libraries||{},capabilities:this.manifest?.capabilities||{},provenance:this.manifest?.provenance||[],celestiaLive:this.celestiaLive};}
}

export const scientificAstronomy=new ScientificAstronomyRuntime();
