import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outDir=path.resolve(root,'..');
function run(args){execFileSync(process.execPath,args,{cwd:root,stdio:'inherit'});}
function hashFile(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function size(file){return fs.statSync(file).size;}
function extract(re,text,label){const m=text.match(re);if(!m)throw new Error(`Could not read ${label}`);return m[1];}

run(['./scripts/check.mjs']);
run(['./scripts/build-standalone.mjs']);

const standalone=path.join(outDir,'LITTLE_LEGENDS_STANDALONE_M0_M29_PRE_RC.html');
const html=fs.readFileSync(standalone,'utf8');
if(!html.includes("__LL_BUILD='M0-M29 release qualification build"))throw new Error('Standalone M29 build marker missing');
if(!html.includes('data:image/png;base64,'))throw new Error('Standalone production art asset missing');
if(!html.includes('ReleaseQualification'))throw new Error('Standalone release qualification module missing');
if(!html.includes('__LL_COMMERCE_ENABLED=false'))throw new Error('Standalone commerce state must be explicit');

const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const activities=JSON.parse(fs.readFileSync(path.join(root,'data/activities.json'),'utf8'));
const adventures=JSON.parse(fs.readFileSync(path.join(root,'data/adventures.json'),'utf8'));
const rewards=JSON.parse(fs.readFileSync(path.join(root,'data/rewards.json'),'utf8'));
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const saveSource=fs.readFileSync(path.join(root,'src/save/SaveSystem.js'),'utf8');
const saveVersion=Number(extract(/const SAVE_VERSION = (\d+);/,saveSource,'save version'));
const cacheId=extract(/const CACHE = '([^']+)'/,sw,'service worker cache');
const familyCount=new Set((activities.activities??[]).map(a=>a.type)).size;
const generatedAt=new Date().toISOString();

const manifest={
  product:'Little Legends: Magic World',
  packageVersion:pkg.version,
  channel:'PRE-RC',
  generatedAt,
  buildMarker:'M0-M29 release qualification build — M26/M29 human gates pending',
  saveVersion,
  serviceWorkerCache:cacheId,
  content:{ activities:(activities.activities??[]).length, activityFamilies:familyCount, littleMissions:(adventures.adventures??[]).length, rewards:(rewards.rewards??[]).length },
  artifacts:{
    standalone:{ file:path.basename(standalone), bytes:size(standalone), sha256:hashFile(standalone) },
    meadowArt:{ file:'assets/art/meadow_picnic_clearing.png', bytes:size(path.join(root,'assets/art/meadow_picnic_clearing.png')), sha256:hashFile(path.join(root,'assets/art/meadow_picnic_clearing.png')) },
    activities:{ file:'data/activities.json', bytes:size(path.join(root,'data/activities.json')), sha256:hashFile(path.join(root,'data/activities.json')) },
    adventures:{ file:'data/adventures.json', bytes:size(path.join(root,'data/adventures.json')), sha256:hashFile(path.join(root,'data/adventures.json')) },
    rewards:{ file:'data/rewards.json', bytes:size(path.join(root,'data/rewards.json')), sha256:hashFile(path.join(root,'data/rewards.json')) }
  }
};
fs.writeFileSync(path.join(root,'RELEASE_ARTIFACT_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');

const report=`# Little Legends — Release Candidate Readiness\n\nGenerated: ${generatedAt}\n\nBuild: **${pkg.version} / M29 qualification build**\n\n## Automated checks — PASS\n\n- Full M0–M29 implementation regression suite\n- ${(activities.activities??[]).length} JSON activities / ${familyCount} reusable activity families\n- ${(adventures.adventures??[]).length} Little Missions / ${(rewards.rewards??[]).length} reward definitions\n- Privacy static audit\n- Local child-test recorder\n- Parent Area → RELEASE qualification panel\n- Persistent device snapshots + manual gate evidence\n- Save v${saveVersion} migration + backup recovery path\n- Offline/PWA source cache coverage (${cacheId})\n- Standalone single-file build\n- Approved meadow art embedded in standalone\n- Performance manager regression\n- Collection/profile isolation regression\n- Release artifact SHA-256 manifest\n\n## Human/device checks — REQUIRED BEFORE M29 CAN PASS\n\nUse **Parent Area → RELEASE** to record these after they are actually tested.\n\n- [ ] Age 2 independent child test\n- [ ] Age 3 independent child test\n- [ ] Age 4 independent child test\n- [ ] Age 5 independent child test\n- [ ] Gate 4: most core activities understood without adult instruction\n- [ ] First / returning / multiple-profile walkthrough\n- [ ] Hint recovery\n- [ ] Reward use + free play\n- [ ] Modern iPad sustained target performance\n- [ ] Supported Android tablet sustained target performance\n- [ ] Weak-device Lite 30 FPS playability\n- [ ] Offline cold-start test on installed tablet build\n- [ ] Install/update/reinstall test\n- [ ] Save migration using a real prior build\n- [ ] Low-storage behaviour on device\n- [ ] App suspension/resume during drag, voice, reward and save\n- [ ] Parent profile/settings/progress/privacy walkthrough\n- [ ] Store/legal privacy wording review\n\nPurchase-gate qualification is explicitly **N/A while commerce is disabled** in this build.\n\n**Status:** PRE-RC. Automated implementation and qualification tooling are complete; M26 and M29 remain human/device gates and are not claimed as passed.\n`;
fs.writeFileSync(path.join(root,'RELEASE_CANDIDATE_STATUS.md'),report);
console.log(path.join(root,'RELEASE_CANDIDATE_STATUS.md'));
console.log(path.join(root,'RELEASE_ARTIFACT_MANIFEST.json'));
