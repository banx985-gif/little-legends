import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ActivityEngine } from '../src/activities/ActivityEngine.js';
import { AdventureEngine } from '../src/adventures/AdventureEngine.js';
import { artIdsForScene } from '../src/core/art.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, '..', 'LITTLE_LEGENDS_STANDALONE_M0_M29_PLAYABLE_FIX1.html');

function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full];}); }
function moduleId(file){return path.relative(root,file).split(path.sep).join('/');}
function resolveImport(fromId,spec){if(!spec.startsWith('.'))throw new Error(`Standalone build only supports local imports: ${spec}`);return path.posix.normalize(path.posix.join(path.posix.dirname(fromId),spec));}
function transform(file){
  const id=moduleId(file);let source=fs.readFileSync(file,'utf8');const exports=[];
  source=source.replace(/^import\s+['"]([^'"]+)['"];?\s*$/gm,(_all,spec)=>`__require(${JSON.stringify(resolveImport(id,spec))});`); // side-effect import (src/utils/compat.js)
  source=source.replace(/^import\s+\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"];?\s*$/gm,(_all,names,spec)=>{const bindings=names.split(',').map(part=>part.trim()).filter(Boolean).map(part=>{const m=part.match(/^(\w+)\s+as\s+(\w+)$/);return m?`${m[1]}: ${m[2]}`:part;}).join(', ');return `const { ${bindings} } = __require(${JSON.stringify(resolveImport(id,spec))});`;});
  source=source.replace(/^export\s+(class|const|function|let|var)\s+(\w+)/gm,(_all,kind,name)=>{exports.push([name,name]);return `${kind} ${name}`;});
  source=source.replace(/^export\s*\{([^}]+)\};?\s*$/gm,(_all,names)=>{for(const part of names.split(',')){const text=part.trim();if(!text)continue;const m=text.match(/^(\w+)\s+as\s+(\w+)$/);exports.push(m?[m[2],m[1]]:[text,text]);}return '';});
  const seen=new Set();const assignments=exports.filter(([name])=>!seen.has(name)&&seen.add(name)).map(([name,local])=>`exports[${JSON.stringify(name)}] = ${local};`).join('\n');
  return `${JSON.stringify(id)}: function(module, exports, __require){\n${source}\n${assignments}\n//# sourceURL=little-legends:///${id}\n}`;
}
const modules=walk(path.join(root,'src')).filter(file=>file.endsWith('.js')).sort().map(transform);
const embeddedData=Object.fromEntries(['activities.json','adventures.json','rewards.json','art_map.json'].map(name=>[`./data/${name}`,JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'))]));
embeddedData['./assets/art_manifest.json']=JSON.parse(fs.readFileSync(path.join(root,'assets','art_manifest.json'),'utf8'));

// Real art: embed everything if the one-file build stays under ~60 MB, otherwise only the starter set
// (Pip, Bunny, Rory, everything in Rory's Dino Picnic, the island, world icons and core UI). Pictures that are
// not embedded show their drawn placeholder in this build.
const ART_BUDGET_BYTES=60*1024*1024;
const manifest=embeddedData['./assets/art_manifest.json'];
const artUrl=new Map(manifest.map(e=>[e.id,e.url.startsWith('./')?e.url.slice(2):e.url]));
const fileBytes=rel=>fs.statSync(path.join(root,rel)).size;
async function starterArtIds(){
  globalThis.__LL_ASSETS={artMap:embeddedData['./data/art_map.json'],get(){return undefined;}};
  const game={assets:null,save:null};game.activityEngine=new ActivityEngine(game);game.adventureEngine=new AdventureEngine(game);
  game.activityEngine.setDefinitions(embeddedData['./data/activities.json']);game.adventureEngine.setDefinitions(embeddedData['./data/adventures.json']);
  const ids=new Set();
  for(const [scene,data] of [['adventure',{adventureId:'rory_dino_picnic'}],['island',{}],['worldSelect',{}],['parentGate',{}]])for(const id of await artIdsForScene(game,scene,data))ids.add(id);
  delete globalThis.__LL_ASSETS;
  return [...ids];
}
const allArt=manifest.map(e=>e.id);
const allArtBytes=allArt.reduce((sum,id)=>sum+fileBytes(artUrl.get(id))*4/3,0);
const embedAll=allArtBytes<=ART_BUDGET_BYTES;
const artIds=embedAll?allArt:await starterArtIds();
const artFiles=[...new Set(['assets/art/meadow_picnic_clearing.png',...artIds.map(id=>artUrl.get(id)).filter(Boolean)])];
const embeddedAssets=Object.fromEntries(artFiles.map(rel=>{const bytes=fs.readFileSync(path.join(root,rel));const mime=rel.endsWith('.png')?'image/png':'application/octet-stream';return[`./${rel}`,`data:${mime};base64,${bytes.toString('base64')}`];}));
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no,maximum-scale=1"/><meta name="theme-color" content="#6ed7ff"/><meta name="mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/><title>Little Legends — M0–M29 Playable Fix 1 Standalone Test</title><style>${css.replace(/<\/style/gi,'<\\/style')}</style></head>
<body><main id="app" aria-label="Little Legends game"><canvas id="game" aria-label="Little Legends interactive game canvas"></canvas></main><noscript>Little Legends needs JavaScript enabled.</noscript><script>
(function(){'use strict';
const __embeddedData=${JSON.stringify(embeddedData).replace(/<\/script/gi,'<\\/script')};
globalThis.__LL_EMBEDDED_ASSETS=${JSON.stringify(embeddedAssets)};
const __nativeFetch=globalThis.fetch?globalThis.fetch.bind(globalThis):null;
globalThis.fetch=async function(resource,init){const raw=typeof resource==='string'?resource:(resource&&resource.url)||String(resource);const key=Object.keys(__embeddedData).find(k=>raw===k||raw.endsWith(k.slice(1))||raw.endsWith(k.replace('./','/')));if(key){const value=__embeddedData[key];return{ok:true,status:200,async json(){return JSON.parse(JSON.stringify(value));},async text(){return JSON.stringify(value);},async arrayBuffer(){return new TextEncoder().encode(JSON.stringify(value)).buffer;}};}if(__nativeFetch)return __nativeFetch(resource,init);throw new Error('Fetch unavailable in standalone mode: '+raw);};
const __defs={${modules.join(',\n')}};const __cache=Object.create(null);function __require(id){if(__cache[id])return __cache[id].exports;const fn=__defs[id];if(!fn)throw new Error('Standalone module not found: '+id);const module={exports:{}};__cache[id]=module;fn(module,module.exports,__require);return module.exports;}globalThis.__LL_STANDALONE=true;globalThis.__LL_COMMERCE_ENABLED=false;globalThis.__LL_BUILD='M0-M29 playable fix 1 — legacy-save world crash fixed; human gates pending';__require('src/main.js');})();
</script></body></html>`;
fs.writeFileSync(out,html);console.log(out);
console.log(`Embedded ${artFiles.length} of ${allArt.length} art files (${embedAll?'all art':'starter set — full art set is '+Math.round(allArtBytes/1048576)+' MB, over the 60 MB one-file limit'}); file size ${(Buffer.byteLength(html)/1048576).toFixed(1)} MB.`);
