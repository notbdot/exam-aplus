// Disposable Docker lifecycle test. No production account, volume, network or port is used.
import {execFileSync} from 'node:child_process';import {mkdtempSync,rmSync,readFileSync,readdirSync,statSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const image=process.argv[2]||'exam-aplus:local',suffix=`${Date.now()}-${process.pid}`,a=`aplus-ci-${suffix}`,b=`aplus-restore-${suffix}`,v=`${a}-data`,w=`${b}-data`,backup=mkdtempSync(join(tmpdir(),'aplus-backup-'));
const docker=(args,input)=>execFileSync('docker',args,{encoding:'utf8',input,stdio:['pipe','pipe','pipe']}).trim();
const run=name=>docker(['exec','-i',name,'node','--input-type=module','-'],`
import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
let last;for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:3000/healthz');if(r.ok){last=null;break;}}catch(e){last=e;}await new Promise(r=>setTimeout(r,100));}if(last)throw last;
const post=(p,b,c='')=>fetch('http://127.0.0.1:3000'+p,{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost:3000',cookie:c},body:JSON.stringify(b)});
const ck=r=>r.headers.get('set-cookie').split(';')[0];let password;
if(!fs.existsSync('/data/auth.json')){password=crypto.randomBytes(24).toString('hex');fs.writeFileSync('/data/.smoke-password',password,{mode:0o600});const enrolled=await post('/api/enroll',{token:fs.readFileSync('/data/bootstrap','utf8')});assert.equal(enrolled.status,200);assert.equal((await post('/api/setup',{password},ck(enrolled))).status,200);}else password=fs.readFileSync('/data/.smoke-password','utf8');
const login=await post('/api/login',{password});assert.equal(login.status,200);const cookie=ck(login);assert.equal((await fetch('http://127.0.0.1:3000/api/state')).status,401);
let state=await(await fetch('http://127.0.0.1:3000/api/state',{headers:{cookie}})).json();
if(state.revision===0){state.state.notes='Synthetic Docker persistence and restore test';state.state.objectives['c1-1.1']={studied:true,notes:'Core 1 synthetic',labNotes:'',nextStep:'',help:'unrecorded'};state.state.objectives['c2-1.1']={studied:false,notes:'Core 2 synthetic',labNotes:'Observed tabletop result',nextStep:'',help:'with-help'};state.state.checks['c1-1-sample-1']={objective:'c1-1.1',choice:0,correct:false,at:100,nextAt:86400100,version:'1',unsure:true,resolved:false};const saved=await post('/api/state',state,cookie);assert.equal(saved.status,200);state=await saved.json();}assert.equal(state.revision,1);assert.equal(state.state.objectives['c1-1.1'].notes,'Core 1 synthetic');assert.equal(state.state.objectives['c2-1.1'].labNotes,'Observed tabletop result');assert.equal(state.state.checks['c1-1-sample-1'].unsure,true);assert.equal((await fetch('http://127.0.0.1:3000/tools/docker-smoke.mjs')).status,404);console.log(JSON.stringify({auth:true,revision:state.revision,bothCores:true,review:true}));
`);
try{
 docker(['volume','create',v]);docker(['volume','create',w]);
 const args=name=>['create','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','64','--memory','256m','--cpus','1','--mount',`type=volume,src=${name===a?v:w},dst=/data`,image];
 docker(args(a));docker(['start',a]);console.log('FRESH',run(a));docker(['exec',a,'node','tools/healthcheck.mjs']);const config=JSON.parse(docker(['inspect',a]))[0];assert.equal(config.Config.User,'node');assert.equal(config.HostConfig.ReadonlyRootfs,true);assert.ok(config.Config.Healthcheck);
 docker(['restart',a]);console.log('RESTART',run(a));docker(['stop',a]);docker(['cp',`${a}:/data/.`,backup]);
 const hash=name=>createHash('sha256').update(readFileSync(join(backup,name))).digest('hex');const authHash=hash('auth.json'),progressHash=hash('progress.json');
 docker(args(b));docker(['cp',backup+'/.',`${b}:/data`]);docker(['run','--rm','--network','none','--user','0','--mount',`type=volume,src=${w},dst=/data`,image,'chown','-R','node:node','/data']);docker(['start',b]);console.log('RESTORE',run(b));docker(['stop',b]);
 const restored=mkdtempSync(join(tmpdir(),'aplus-restored-'));try{docker(['cp',`${b}:/data/.`,restored]);assert.equal(createHash('sha256').update(readFileSync(join(restored,'auth.json'))).digest('hex'),authHash);assert.equal(createHash('sha256').update(readFileSync(join(restored,'progress.json'))).digest('hex'),progressHash);}finally{rmSync(restored,{recursive:true,force:true});}
 console.log('PASS: non-root/read-only image, healthcheck, fresh enrollment, both-core save, persistent review, restart/re-login, consistent full-volume backup and independent restore; auth/progress byte-identical.');
}finally{
 for(const name of [a,b])try{docker(['rm','-f',name]);}catch{}
 for(const name of [v,w])try{docker(['volume','rm',name]);}catch{}
 rmSync(backup,{recursive:true,force:true});
}
