export const objectiveKey = /^c[12]-[1-9]\.[1-9][0-9]?$/;
export const emptyEntry = () => ({studied:false,notes:'',labNotes:'',nextStep:'',help:'unrecorded'});
export function initialState(catalog) {
 return {schemaVersion:1,edition:catalog.edition,selectedCore:'core1',selection:Object.fromEntries(catalog.cores.map(c=>[c.id,c.objectives[0].id])),notes:'',objectives:{},materialCovered:{},materialNotes:{},checks:{}};
}
export function validateState(s,catalog) {
 const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const only=(x,keys)=>record(x)&&Object.keys(x).every(k=>keys.includes(k));
 const ids=new Map(catalog.cores.flatMap(c=>c.objectives.map(o=>[o.id,c.id])));
 const text=(x,n)=>typeof x==='string'&&x.length<=n;
 if(!only(s,['schemaVersion','edition','selectedCore','selection','notes','objectives','materialCovered','materialNotes','checks'])||s.schemaVersion!==1||s.edition!==catalog.edition||!['core1','core2'].includes(s.selectedCore)||!only(s.selection,['core1','core2'])||catalog.cores.some(c=>ids.get(s.selection[c.id])!==c.id)||!text(s.notes,12000)||!record(s.objectives)||!record(s.materialNotes)||!record(s.materialCovered)||!record(s.checks)||Object.keys(s.checks).length>500)return false;
 const materials=new Set(catalog.cores.flatMap(c=>c.objectives.flatMap(o=>o.materials||[])));
 for(const [id,v] of Object.entries(s.materialNotes))if(!materials.has(id)||!text(v,12000))return false;
 for(const [id,v] of Object.entries(s.materialCovered))if(!materials.has(id)||typeof v!=='boolean')return false;
 for(const [id,e] of Object.entries(s.objectives))if(!ids.has(id)||!only(e,['studied','notes','labNotes','nextStep','help'])||typeof e.studied!=='boolean'||!['unrecorded','with-help','without-help'].includes(e.help)||!text(e.notes,30000)||!text(e.labNotes,30000)||!text(e.nextStep,2000))return false;
 for(const [id,e] of Object.entries(s.checks))if(!/^[a-z0-9-]{1,80}$/.test(id)||!only(e,['objective','choice','correct','at','version','unsure','nextAt','resolved'])||!catalog.questions.some(q=>q.id===id&&q.objective===e.objective)||!Number.isInteger(e.choice)||e.choice<0||e.choice>9||typeof e.correct!=='boolean'||typeof e.unsure!=='boolean'||typeof e.resolved!=='boolean'||!Number.isSafeInteger(e.nextAt)||e.nextAt<0||!text(e.version,30)||!Number.isSafeInteger(e.at)||e.at<0)return false;
 return true;
}
export function coreStats(state,core) {
 const studied=core.objectives.filter(o=>state.objectives[o.id]?.studied).length;
 const checks=Object.values(state.checks).filter(c=>core.objectives.some(o=>o.id===c.objective));
 return {studied,total:core.objectives.length,checked:new Set(checks.map(c=>c.objective)).size,revisit:checks.filter(c=>!c.resolved).length};
}
export function nextAction(state,core) {
 const missed=Object.values(state.checks).filter(c=>!c.resolved&&c.nextAt<=Date.now()&&core.objectives.some(o=>o.id===c.objective)).sort((a,b)=>a.at-b.at)[0];
 if(missed)return {id:missed.objective,reason:'Revisit a due sample-check reminder'};
 const selected=core.objectives.find(o=>o.id===state.selection[core.id]);
 if(selected&&!state.objectives[selected.id]?.studied)return {id:selected.id,reason:'Continue your last-opened objective'};
 const start=Math.max(0,core.objectives.indexOf(selected));
 const unfinished=[...core.objectives.slice(start+1),...core.objectives.slice(0,start+1)].find(o=>!state.objectives[o.id]?.studied);
 return unfinished?{id:unfinished.id,reason:'Study your next objective'}:{id:core.objectives[0].id,reason:'Revisit an objective — studying every objective is not proof of exam readiness'};
}
export function safeLink(value) {if(/^\/private\/[-a-zA-Z0-9_]+\.(pdf|txt|md)$/.test(value))return value;try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
export function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function validateCatalog(c){
 try{
  if(c.edition!=='aplus-v15'||c.cores.length!==2||!c.verified)return false;
  const ids=new Set(),materials=new Set();
  for(const [i,core] of c.cores.entries()){
   if(core.id!==`core${i+1}`||core.code!==`220-120${i+1}`||!safeLink(core.courseUrl)||!safeLink(core.objectivesUrl)||core.domains.reduce((n,d)=>n+d.weight,0)!==100)return false;
   const domains=new Set(core.domains.map(d=>d.number));
   if(domains.size!==core.domains.length||!core.objectives.length)return false;
   for(const o of core.objectives){if(ids.has(o.id)||o.id!==`c${i+1}-${o.number}`||!objectiveKey.test(o.id)||!domains.has(o.domain)||o.domain!==o.number.split('.')[0]+'.0'||![o.title,o.summary,o.recall,o.task.title,o.task.scenario,o.task.prerequisites,o.task.rubric].every(x=>typeof x==='string'&&x.trim())||!o.task.steps.length)return false;ids.add(o.id);for(const id of o.materials){if(materials.has(id))return false;materials.add(id);}}
  }
  return Array.isArray(c.questions)&&new Set(c.questions.map(q=>q.id)).size===c.questions.length&&c.questions.every(q=>ids.has(q.objective));
 }catch{return false;}
}
export function validateQuestions(bank,catalog){return Array.isArray(bank)&&new Set(bank.map(q=>q.id)).size===bank.length&&bank.every(q=>catalog.questions.some(ref=>ref.id===q.id&&ref.objective===q.objective)&&typeof q.version==='string'&&q.version.length>0&&typeof q.q==='string'&&typeof q.why==='string'&&Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=10&&q.options.every(a=>typeof a==='string')&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);}
export function validateResources(bank,catalog){return Array.isArray(bank)&&new Set(bank.map(r=>r.id)).size===bank.length&&bank.every(r=>typeof r.id==='string'&&typeof r.title==='string'&&typeof r.provider==='string'&&['free','paid / own license','private / own license'].includes(r.access)&&Array.isArray(r.objectives)&&catalog.cores.some(c=>c.id===r.core&&r.objectives.every(id=>c.objectives.some(o=>o.id===id)))&&safeLink(r.url));}

export function tomorrowAt(now=Date.now()){const date=new Date(now);date.setDate(date.getDate()+1);date.setHours(9,0,0,0);return date.getTime();}
