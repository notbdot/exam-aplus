import {api} from './api.js';
import {initialState,emptyEntry,tomorrowAt} from './model.js';
let data,catalog,conflicted=false,dirty=false,savingPromise=null,saveTimer=null,statusEl=null;
export function initStore(progress,content){data=progress;catalog=content;conflicted=false;dirty=false;window.addEventListener('beforeunload',e=>{if(isDirty()){e.preventDefault();e.returnValue='';}});}
export function getState(){return data;}
export function getCatalog(){return catalog;}
export function currentCore(){return catalog.cores.find(c=>c.id===data.state.selectedCore);}
export function currentObjective(){return currentCore().objectives.find(o=>o.id===data.state.selection[data.state.selectedCore]);}
export function entry(id){return data.state.objectives[id]||emptyEntry();}
export function selectCore(id){const c=catalog.cores.find(c=>c.id===id);if(!c)return;data.state.selectedCore=id;touch();}
export function selectObjective(id){const c=catalog.cores.find(c=>c.objectives.some(o=>o.id===id));if(!c)return;data.state.selectedCore=c.id;data.state.selection[data.state.selectedCore]=id;touch();}
export function setEntry(id,key,value){data.state.objectives[id]={...entry(id),[key]:value};touch();}
export function setMaterialNote(id,value){data.state.materialNotes[id]=String(value);touch();}
export function setMaterial(id,value){data.state.materialCovered[id]=value===true;touch();}
export function setNotes(value){data.state.notes=value;touch();}
export function recordCheck(q,choice,unsure=false){const at=Date.now(),previous=data.state.checks[q.id];data.state.checks[q.id]={objective:q.objective,choice,correct:choice===q.answer,at,version:q.version,unsure,nextAt:tomorrowAt(at),resolved:previous?.resolved===false?false:choice===q.answer&&!unsure};touch();}
export function reviewAction(id,action){const c=data.state.checks[id];if(!c)return;c.resolved=action==='resolve';c.nextAt=action==='later'?tomorrowAt():Date.now();touch();}
export function importProgress(value){if(isDirty())throw Error('Save or download your current draft before importing.');data.state=value;touch();}
function updateStatus(state, text) {
  if (!statusEl) statusEl = document.getElementById('saveStatus');
  if (!statusEl) return;
  statusEl.dataset.state = state;
  const labels = { unsaved: 'Unsaved', saving: 'Saving…', saved: text || 'Saved', failed: text || 'Save failed' };
  statusEl.textContent = labels[state] || text || state;
  document.querySelectorAll?.('[data-save-mirror]').forEach(el => { el.textContent = statusEl.textContent; el.dataset.state = state; });
  document.querySelectorAll?.('.review-save').forEach(el=>{if(state==='saved')el.textContent='Result saved. Open Today to view the review list.';else if(state==='failed')el.textContent='Current changes include an unsaved draft in this tab. Use Retry or download the draft.';});
  const retry = document.getElementById('retrySave');
  if (retry) retry.hidden = state !== 'failed' || conflicted;
  const backup = document.getElementById('backupDraft');
  if (backup) backup.hidden = state !== 'failed';
}

export function touch() {
  dirty = true;
  window.dispatchEvent(new Event('progresschange'));
  if (conflicted) { updateStatus('failed', 'Changed on another device. Download your draft before reloading.'); return; }
  updateStatus('unsaved');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save().catch(() => {}), 600);
}

export function flush() {
  clearTimeout(saveTimer);
  return save().catch(() => {});
}

async function save() {
  if (conflicted) return;
  if (savingPromise) return savingPromise;
  savingPromise = (async () => {
    while (dirty && data) {
      dirty = false;
      updateStatus('saving');
      try {
        const payload = { revision: data.revision, state: JSON.parse(JSON.stringify(data.state)) };
        const saved = await api('/api/state', payload);
        data.revision = saved.revision;
        // Keep edits made while this request was in flight. The next loop saves them.
        if (!dirty) data.state = saved.state;
        updateStatus('saved', `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      } catch (e) {
        dirty = true;
        if (e.status === 409) { conflicted = true; updateStatus('failed', 'Changed on another device. Download your draft before reloading.'); }
        else updateStatus('failed', 'Save failed — Retry');
        break;
      }
    }
  })().finally(() => { savingPromise = null; });
  return savingPromise;
}

export function retrySave() { return save(); }
export function isDirty() { return dirty || savingPromise !== null; }

