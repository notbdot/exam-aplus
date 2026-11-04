import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,emptyEntry,validateState,validateCatalog,validateQuestions,validateResources,coreStats,nextAction,safeLink,escapeHTML} from '../web/model.js';
const catalog=JSON.parse(readFileSync(new URL('../web/catalog.json',import.meta.url))),questions=JSON.parse(readFileSync(new URL('../web/questions.json',import.meta.url))),resources=JSON.parse(readFileSync(new URL('../web/resources.json',import.meta.url)));
test('versioned pack has complete both-core domains and consistent public lesson/question mappings',()=>{
 assert.ok(validateCatalog(catalog));assert.ok(validateQuestions(questions,catalog));assert.ok(validateResources(resources,catalog));
 assert.deepEqual(catalog.cores.map(c=>c.objectives.length),[27,36]);assert.deepEqual(catalog.cores.map(c=>c.domains.length),[5,4]);
 for(const c of catalog.cores)for(const d of c.domains){assert.equal(questions.filter(q=>q.objective.startsWith(`c${c.id.slice(-1)}-${d.number.split('.')[0]}.`)).length,2);assert.ok(c.objectives.some(o=>o.domain===d.number&&o.task.steps.length>=3));}
 for(const r of resources)assert.ok(catalog.cores.some(c=>c.objectives.some(o=>o.materials.includes(r.id))));
});
test('cores have independent identity and selections; catalog reordering does not remap notes',()=>{
 const s=initialState(catalog);s.objectives['c1-1.1']={...emptyEntry(),notes:'Core 1 note'};s.objectives['c2-1.1']={...emptyEntry(),notes:'Core 2 note'};s.selection.core1='c1-2.1';s.selection.core2='c2-1.10';
 const reordered=structuredClone(catalog);reordered.cores.forEach(c=>c.objectives.reverse());assert.ok(validateState(s,reordered));assert.equal(s.objectives['c1-1.1'].notes,'Core 1 note');assert.equal(s.objectives['c2-1.1'].notes,'Core 2 note');
 s.selection.core2='c1-1.1';assert.equal(validateState(s,catalog),false);
});
test('foreign editions, unknown IDs, invalid evidence and oversized notes fail closed',()=>{
 for(const mutate of [s=>s.edition='ccna',s=>s.objectives['1']={...emptyEntry()},s=>s.notes='x'.repeat(12001),s=>s.objectives['c1-1.1']={...emptyEntry(),help:'mastered'},s=>s.materialCovered['unknown']=true,s=>s.checks.unknown={objective:'c1-1.1',choice:0,correct:true,at:0,nextAt:0,version:'1',unsure:false,resolved:false},s=>s.selection.extra='x']){const s=initialState(catalog);mutate(s);assert.equal(validateState(s,catalog),false);}
});
test('coverage and review evidence remain separate with no exam-readiness inference',()=>{
 const s=initialState(catalog),c=catalog.cores[0],q=questions[0];s.objectives[q.objective]={...emptyEntry(),studied:true};s.checks[q.id]={objective:q.objective,choice:0,correct:false,at:100,nextAt:86400100,version:q.version,unsure:false,resolved:false};
 assert.ok(validateState(s,catalog));assert.deepEqual(coreStats(s,c),{studied:1,total:27,checked:1,revisit:1});assert.equal(nextAction(s,c).id,q.objective);s.checks[q.id].resolved=true;assert.notEqual(nextAction(s,c).id,q.objective);
});
test('unsafe resources and malformed/duplicate answer banks are rejected',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,bad','http://evil.invalid','/private/../auth.json'])assert.equal(safeLink(url),null);
 assert.equal(safeLink('/private/owned-notes.pdf'),'/private/owned-notes.pdf');assert.equal(escapeHTML('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
 assert.equal(validateQuestions([...questions,questions[0]],catalog),false);assert.equal(validateQuestions([{...questions[0],answer:99}],catalog),false);assert.equal(validateResources([{...resources[0],url:'javascript:x'}],catalog),false);
});
test('material notes stay keyed to stable source IDs and foreign material IDs fail validation',()=>{const s=initialState(catalog),id=catalog.cores[0].objectives[0].materials[0];s.materialNotes[id]='Synthetic note for one provider resource';s.materialCovered[id]=true;assert.ok(validateState(s,catalog));s.materialNotes.foreign='wrong';assert.equal(validateState(s,catalog),false);});
test('continue restores each core’s own unfinished selection and skips covered briefs',()=>{const s=initialState(catalog);s.selection.core1='c1-3.4';s.selection.core2='c2-4.10';assert.equal(nextAction(s,catalog.cores[0]).id,'c1-3.4');assert.equal(nextAction(s,catalog.cores[1]).id,'c2-4.10');s.objectives['c2-4.10']={...emptyEntry(),studied:true};assert.equal(nextAction(s,catalog.cores[1]).id,'c2-1.1');});
