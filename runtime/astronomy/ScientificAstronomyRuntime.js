import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';

const CATALOG_URL='./assets/astronomy/runtime-catalog.json';
const CELESTIA_MANIFEST_URL='./assets/astronomy/celestia-manifest.json';

export class ScientificAstronomyRuntime{
  constructor(){this.catalog=null;this.celestiaManifest=null;this.ready=false;this.failed=false;this.stats={ready:false,stars:0,bodies:0,gaia:false,horizons:false,skyview:false,wcs:false,spectralCube:false,celestia:false,lastError:null};this.readyPromise=this.load();}
  async load(){try{const [catalogResponse,manifestResponse]=await Promise.all([fetch(CATALOG_URL,{cache:'no-store'}),fetch(CELESTIA_MANIFEST_URL,{cache:'no-store'}).catch(()=>null)]);if(!catalogResponse.ok)throw new Error(`astronomy_catalog_http_${catalogResponse.status}`);this.catalog=await catalogResponse.json();if(manifestResponse?.ok)this.celestiaManifest=await manifestResponse.json();const sources=this.catalog.sources||{},products=this.catalog.products||{},celestia=this.catalog.celestia||{};this.ready=true;this.stats={ready:true,stars:this.catalog.stars?.length||0,bodies:this.catalog.solarSystem?.length||0,gaia:Boolean(sources.gaia?.ok),horizons:Boolean(sources.horizons?.ok),skyview:Boolean(sources.skyview?.ok),wcs:Boolean(products.wcs?.ok),spectralCube:Boolean(products.spectralCube?.ok),celestia:Boolean(celestia.ok||this.celestiaManifest?.literalSharedLibrary),lastError:null};runtimeCapabilities.mark('astropy-stack',true,{libraries:this.catalog.libraries||{},products:Object.keys(products)});runtimeCapabilities.mark('gaia-catalog',this.stats.gaia,{count:this.stats.stars,source:'ESA Gaia Archive'});runtimeCapabilities.mark('nasa-jpl-catalog',this.stats.horizons,{count:this.stats.bodies,source:'NASA/JPL Horizons'});runtimeCapabilities.mark('wcs-science',this.stats.wcs,{wcsAxes:true,reproject:true,aplpy:true});runtimeCapabilities.mark('spectral-cube',this.stats.spectralCube,{source:products.spectralCube?.observationalSpectra?'observational':'derived validation cube'});runtimeCapabilities.mark('celestia-literal',this.stats.celestia,{manifest:this.celestiaManifest||null,bridge:Boolean(celestia.ok)});return true;}catch(error){this.failed=true;this.stats.lastError=String(error);runtimeCapabilities.mark('astropy-stack',false,{error:String(error)});runtimeCapabilities.mark('celestia-literal',false,{error:String(error)});return false;}}
  stars(limit=256){return (this.catalog?.stars||[]).slice(0,limit);}
  bodies(){return this.catalog?.solarSystem||[];}
  body(name){const n=String(name||'').toLowerCase();return this.bodies().find(b=>String(b.name||'').toLowerCase()===n)||null;}
  get epoch(){return this.catalog?.epoch||null;}
  snapshot(){return{...this.stats,epoch:this.epoch,libraries:this.catalog?.libraries||{},celestiaManifest:this.celestiaManifest};}
}

export const scientificAstronomy=new ScientificAstronomyRuntime();
