// ===== Storage (multi-week) =====
function loadAll(){
  const old = localStorage.getItem("sergio-plan");
  if(old && !localStorage.getItem("sergio-weeks")){
    try{
      const plan = JSON.parse(old);
      const wk = plan.weekStart || new Date().toISOString().slice(0,10);
      const all = {}; all[wk] = plan;
      localStorage.setItem("sergio-weeks", JSON.stringify(all));
      localStorage.removeItem("sergio-plan");
    }catch{}
  }
  const raw = localStorage.getItem("sergio-weeks");
  if(!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
function saveAll(all){ localStorage.setItem("sergio-weeks", JSON.stringify(all)); }

function defaultPlan(weekStart){
  return {
    weekStart,
    days: [
      { name: "Lunes", blocks: [makeAnterior(), makeWalkDaily()] },
      { name: "Martes", blocks: [makeCaminata(), makeWalkDaily()] },
      { name: "Miércoles", blocks: [makeHIIT(), makeWalkDaily()] },
      { name: "Jueves", blocks: [makeCaminata(), makeWalkDaily()] },
      { name: "Viernes", blocks: [makePosterior(), makeWalkDaily()] },
      { name: "Sábado", blocks: [makeLibre()] },
      { name: "Domingo", blocks: [makeLudica()] },
    ],
    biometrics: {}
  };
}

// ===== Templates =====
function ex(name, target, sets=3){
  const s = []; for(let i=0;i<sets;i++) s.push({w:"", r:""});
  return { name, target, sets:s };
}
function makeAnterior(){ return { type:"Cara anterior", done:false, notes:"", exercises:[
  ex("Press banca horizontal","3 x 8–12"), ex("Elevaciones frontales en polea baja","3 x 10–12"),
  ex("Extensión de rodilla","3 x 10"), ex("Curl bíceps polea baja","3 x 10–12"), ex("Crunch en polea alta","3 x 12")
]};}
function makePosterior(){ return { type:"Cara posterior", done:false, notes:"", exercises:[
  ex("Pull-down en polea alta","3 x 10–12"), ex("Face pull en polea media","3 x 10–12"),
  ex("Extensión cadera polea baja (cada lado)","3 x 10"), ex("Extensión tríceps polea alta","3 x 10–12"), ex("Hiperextensión lumbar en máquina","3 x 12")
]};}
function makeHIIT(){ return { type:"HIIT", done:false, notes:"Z2 en calentamiento, 45"/20" en circuito, finisher ≤150ppm", exercises:[
  { name:"Elíptica (calentamiento Z2)", target:"10 min · 110–120 ppm", sets:[] },
  { name:"Puente de glúteos isométrico", target:"45" / 20"", sets:[] },
  { name:"Remo invertido en barra", target:"45" / 20"", sets:[] },
  { name:"Peso muerto rumano con kettlebell", target:"45" / 20"", sets:[] },
  { name:"Zancada estática + press militar", target:"45" / 20"", sets:[] },
  { name:"Press Pallof isométrico", target:"45" / 20"", sets:[] },
  { name:"Bird-dog alterno", target:"45" / 20"", sets:[] },
  { name:"Rondas finales", target:"6–8 rondas: 2–3 burpees + 30" skipping", sets:[] },
]};}
function makeCaminata(){ return { type:"Caminata", done:false, notes:"", exercises:[ ex("Caminata","30–45 min a 5.5–6 km/h", 0) ] } }
function makeLibre(){ return { type:"Entrenamiento libre", done:false, notes:"Añade aquí lo que quieras trabajar", exercises:[] } }
function makeLudica(){ return { type:"Actividad lúdica", done:false, notes:"Bici, trote suave, etc.", exercises:[ ex("Libre","30–60 min", 0) ] } }
function makeWalkDaily(){ return { type:"Caminata diaria", walk:true, done:false, walkData:{ tiempo:"", distancia:"", fc:"", sensaciones:"" } } }

// ===== UI elements =====
const el = s => document.querySelector(s);
const planner = el("#planner");
const weekInput = el("#weekStart");
const weekPicker = el("#weekPicker");

function init(){
  document.querySelectorAll(".tab").forEach(t=>{
    t.onclick = () => {
      document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      el("#tab-"+t.dataset.tab).classList.add("active");
      if(t.dataset.tab==="graficos"){ drawCharts(); }
      if(t.dataset.tab==="historial"){ renderHistory(); }
    };
  });

  el("#newWeekBtn").onclick = () => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1);
    const wk = d.toISOString().slice(0,10);
    createWeekIfMissing(wk, true);
  };
  el("#duplicateWeekBtn").onclick = duplicateWeek;
  el("#exportAllBtn").onclick = exportAll;
  el("#exportWeekReport").onclick = exportWeekReport;
  el("#importAllFile").addEventListener("change", importAll);
  el("#resetBtn").onclick = resetAll;

  weekInput.addEventListener("change", e=> createWeekIfMissing(e.target.value, true));

  el("#saveBio").onclick = saveBiometrics;

  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  monday.setDate(monday.getDate() + diffToMonday);
  const wk = monday.toISOString().slice(0,10);
  createWeekIfMissing(wk, true);
}

function listWeeks(){
  const all = loadAll();
  return Object.keys(all).sort();
}
function createWeekIfMissing(weekStart, setActive){
  const all = loadAll();
  if(!all[weekStart]){
    all[weekStart] = defaultPlan(weekStart);
    saveAll(all);
  }
  if(setActive) setActiveWeek(weekStart);
  refreshWeekPicker(weekStart);
  render();
  renderHistory();
}
function setActiveWeek(weekStart){ localStorage.setItem("sergio-active-week", weekStart); }
function getActiveWeek(){ return localStorage.getItem("sergio-active-week"); }
function refreshWeekPicker(current){
  const weeks = listWeeks();
  weekPicker.innerHTML = weeks.map(w=>`<option value="${w}" ${w===current?"selected":""}>${w}</option>`).join("");
  weekPicker.onchange = () => {
    setActiveWeek(weekPicker.value);
    weekInput.value = weekPicker.value;
    render(); renderHistory();
  };
  weekInput.value = current;
}

function loadStateFor(weekStart){ return loadAll()[weekStart]; }
function saveStateFor(weekStart, state){ const all = loadAll(); all[weekStart] = state; saveAll(all); }

function render(){
  const wk = getActiveWeek();
  const state = loadStateFor(wk);
  planner.innerHTML = "";
  state.days.forEach((day, idx) => {
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    dayDiv.innerHTML = `<h3>${day.name}<span class="day-actions"><button class="btn" data-idx="${idx}" data-act="summary">Resumen diario</button></span></h3>`;

    day.blocks.forEach((block, bIdx) => {
      const blockDiv = document.createElement("div");
      blockDiv.className = "block " + (block.done ? "done": "");

      if(block.walk){ // caminata diaria UI
        const wd = block.walkData || { tiempo:"", distancia:"", fc:"", sensaciones:"" };
        blockDiv.innerHTML = `
          <header>
            <strong>${block.type}</strong>
            <div class="controls">
              <label class="inline"><input type="checkbox" ${block.done?"checked":""} data-idx="${idx}" data-bidx="${bIdx}" class="doneToggle"> Completado</label>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-act="del">Borrar bloque</button>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-act="dupBlock">Duplicar bloque</button>
            </div>
          </header>
          <div class="walk">
            <label>Tiempo (min) <input type="number" step="1" data-idx="${idx}" data-bidx="${bIdx}" data-field="tiempo" class="walkInput" value="${wd.tiempo||""}"></label>
            <label>Distancia (km) <input type="number" step="0.01" data-idx="${idx}" data-bidx="${bIdx}" data-field="distancia" class="walkInput" value="${wd.distancia||""}"></label>
            <label>FC media (ppm) <input type="number" step="1" data-idx="${idx}" data-bidx="${bIdx}" data-field="fc" class="walkInput" value="${wd.fc||""}"></label>
            <label style="grid-column:1/-1;">Sensaciones <textarea data-idx="${idx}" data-bidx="${bIdx}" data-field="sensaciones" class="walkText">${wd.sensaciones || ""}</textarea></label>
          </div>
        `;
      } else {
        const maxSets = Math.max(0, ...(block.exercises||[]).map(ex=> (ex.sets||[]).length ));
        const thead = `<th>Ejercicio</th><th>Objetivo</th>` + Array.from({length:maxSets}, (_,i)=>`<th>Set ${i+1} (kg x reps)</th>`).join("") + `<th class="small">Acciones</th>`;
        const rows = (block.exercises||[]).map((ex,eIdx)=>{
          const cols = Array.from({length:maxSets}, (_,i)=>{
            const s = (ex.sets||[])[i] || {w:"",r:""};
            return `<td contenteditable data-idx="${idx}" data-bidx="${bIdx}" data-eidx="${eIdx}" data-sidx="${i}" class="cell">${fmtSet(s)}</td>`;
          }).join("");
          return `<tr>
            <td contenteditable class="exName" data-idx="${idx}" data-bidx="${bIdx}" data-eidx="${eIdx}">${ex.name}</td>
            <td contenteditable class="exTarget" data-idx="${idx}" data-bidx="${bIdx}" data-eidx="${eIdx}">${ex.target||""}</td>
            ${cols}
            <td class="table-controls">
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-eidx="${eIdx}" data-act="addSet">+ set</button>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-eidx="${eIdx}" data-act="rmSet">- set</button>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-eidx="${eIdx}" data-act="dupEx">Duplicar</button>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-eidx="${eIdx}" data-act="delEx">Eliminar</button>
            </td>
          </tr>`;
        }).join("");

        blockDiv.innerHTML = `
          <header>
            <strong>${block.type}</strong>
            <div class="controls">
              <label class="inline"><input type="checkbox" ${block.done?"checked":""} data-idx="${idx}" data-bidx="${bIdx}" class="doneToggle"> Completado</label>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-act="editType">Renombrar bloque</button>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-act="dupBlock">Duplicar bloque</button>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-act="addEx">Añadir ejercicio</button>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-act="notes">Sensaciones</button>
              <button class="btn" data-idx="${idx}" data-bidx="${bIdx}" data-act="del">Borrar bloque</button>
            </div>
          </header>
          <table class="ex-table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${rows || ""}</tbody>
          </table>
          <div class="controls">
            <span class="note-link" data-idx="${idx}" data-bidx="${bIdx}" data-act="notes">📝 Ver/editar sensaciones del bloque</span>
          </div>`;
      }

      dayDiv.appendChild(blockDiv);
    });

    const add = document.createElement("button");
    add.className = "btn primary";
    add.textContent = "Añadir bloque";
    add.onclick = () => addBlock(idx);
    dayDiv.appendChild(add);

    planner.appendChild(dayDiv);
  });

  attachHandlers();
  loadBiometrics();
}

function fmtSet(s){ if(!s) return ""; const w=s.w||"", r=s.r||""; return (!w && !r) ? "" : `${w} x ${r}`; }
function parseSet(text){ const p=text.split("x").map(s=>s.trim()); return p.length===2?{w:p[0],r:p[1]}:p.length===1?{w:p[0],r:""}:{w:"",r:""}; }

function attachHandlers(){
  // strength cells
  document.querySelectorAll(".cell").forEach(td=>{
    td.addEventListener("blur", e => {
      const td = e.target;
      const wk = getActiveWeek();
      const state = loadStateFor(wk);
      const d = state.days[td.dataset.idx];
      const b = d.blocks[td.dataset.bidx];
      const ex = b.exercises[td.dataset.eidx];
      const sidx = +td.dataset.sidx;
      if(!ex.sets) ex.sets = [];
      while(ex.sets.length <= sidx){ ex.sets.push({w:"",r:""}); }
      ex.sets[sidx] = parseSet(td.textContent);
      saveStateFor(wk, state);
    });
  });
  // edit ex name/target
  document.querySelectorAll(".exName").forEach(cell=>{
    cell.addEventListener("blur", e=>{
      const c=e.target; const wk=getActiveWeek(); const st=loadStateFor(wk);
      st.days[c.dataset.idx].blocks[c.dataset.bidx].exercises[c.dataset.eidx].name = c.textContent.trim();
      saveStateFor(wk, st);
    });
  });
  document.querySelectorAll(".exTarget").forEach(cell=>{
    cell.addEventListener("blur", e=>{
      const c=e.target; const wk=getActiveWeek(); const st=loadStateFor(wk);
      st.days[c.dataset.idx].blocks[c.dataset.bidx].exercises[c.dataset.eidx].target = c.textContent.trim();
      saveStateFor(wk, st);
    });
  });

  // done toggles
  document.querySelectorAll(".doneToggle").forEach(chk=>{
    chk.addEventListener("change", e => {
      const c = e.target;
      const wk = getActiveWeek();
      const state = loadStateFor(wk);
      const b = state.days[c.dataset.idx].blocks[c.dataset.bidx];
      b.done = c.checked;
      saveStateFor(wk, state); render();
    });
  });

  // block actions
  document.querySelectorAll("button[data-act='editType']").forEach(btn=> btn.onclick = () => renameBlock(+btn.dataset.idx, +btn.dataset.bidx));
  document.querySelectorAll("button[data-act='addEx']").forEach(btn=> btn.onclick = () => addExercise(+btn.dataset.idx, +btn.dataset.bidx));
  document.querySelectorAll("button[data-act='del']").forEach(btn=> btn.onclick = () => delBlock(+btn.dataset.idx, +btn.dataset.bidx));
  document.querySelectorAll("button[data-act='notes'], .note-link[data-act='notes']").forEach(btn=> btn.onclick = () => openNotes(+btn.dataset.idx, +btn.dataset.bidx));
  document.querySelectorAll("button[data-act='dupBlock']").forEach(btn=> btn.onclick = () => dupBlock(+btn.dataset.idx, +btn.dataset.bidx));
  // daily summary
  document.querySelectorAll("button[data-act='summary']").forEach(btn=> btn.onclick = () => openDailySummary(+btn.dataset.idx));

  // exercise actions
  document.querySelectorAll("button[data-act='addSet']").forEach(btn=> btn.onclick = () => addSet(+btn.dataset.idx, +btn.dataset.bidx, +btn.dataset.eidx));
  document.querySelectorAll("button[data-act='rmSet']").forEach(btn=> btn.onclick = () => removeSet(+btn.dataset.idx, +btn.dataset.bidx, +btn.dataset.eidx));
  document.querySelectorAll("button[data-act='dupEx']").forEach(btn=> btn.onclick = () => dupExercise(+btn.dataset.idx, +btn.dataset.bidx, +btn.dataset.eidx));
  document.querySelectorAll("button[data-act='delEx']").forEach(btn=> btn.onclick = () => delExercise(+btn.dataset.idx, +btn.dataset.bidx, +btn.dataset.eidx));

  // walk inputs
  document.querySelectorAll(".walkInput").forEach(inp=>{
    inp.addEventListener("input", e => {
      const i = e.target;
      const wk = getActiveWeek();
      const st = loadStateFor(wk);
      const b = st.days[i.dataset.idx].blocks[i.dataset.bidx];
      b.walkData = b.walkData || { tiempo:"", distancia:"", fc:"", sensaciones:"" };
      b.walkData[i.dataset.field] = i.value;
      saveStateFor(wk, st);
    });
  });
  document.querySelectorAll(".walkText").forEach(ta=>{
    ta.addEventListener("input", e => {
      const i = e.target;
      const wk = getActiveWeek();
      const st = loadStateFor(wk);
      const b = st.days[i.dataset.idx].blocks[i.dataset.bidx];
      b.walkData = b.walkData || { tiempo:"", distancia:"", fc:"", sensaciones:"" };
      b.walkData[i.dataset.field] = i.value;
      saveStateFor(wk, st);
    });
  });

  // share modal controls
  document.getElementById("shareClose").onclick = () => document.getElementById("modalShare").classList.add("hidden");
  document.getElementById("shareCopy").onclick = () => {
    const ta = document.getElementById("shareTextarea");
    ta.select(); document.execCommand("copy");
  };
  document.getElementById("shareDownload").onclick = () => {
    const wk = getActiveWeek();
    const idx = document.getElementById("modalShare").dataset.dayidx;
    const dayName = loadStateFor(wk).days[idx].name;
    const blob = new Blob([document.getElementById("shareTextarea").value], {type:"text/plain"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `resumen_${wk}_${dayName}.txt`; a.click();
  };
}

// actions
function addBlock(dayIdx){
  const type = prompt("Tipo de bloque (Cara anterior, Cara posterior, HIIT, Caminata, Caminata diaria, Entrenamiento libre, Actividad lúdica, otro):","Caminata diaria");
  if(!type) return;
  const wk = getActiveWeek();
  const state = loadStateFor(wk);
  if(type.toLowerCase().includes("caminata diaria")){
    state.days[dayIdx].blocks.push(makeWalkDaily());
  }else{
    state.days[dayIdx].blocks.push({ type, done:false, notes:"", exercises: [] });
  }
  saveStateFor(wk, state); render();
}
function renameBlock(dayIdx, blockIdx){
  const wk=getActiveWeek(); const st=loadStateFor(wk);
  const b=st.days[dayIdx].blocks[blockIdx];
  const nt = prompt("Nuevo nombre del bloque:", b.type);
  if(nt!==null) { b.type = nt; saveStateFor(wk, st); render(); }
}
function dupBlock(dayIdx, blockIdx){
  const wk=getActiveWeek(); const st=loadStateFor(wk);
  const b = JSON.parse(JSON.stringify(st.days[dayIdx].blocks[blockIdx]));
  st.days[dayIdx].blocks.splice(blockIdx+1, 0, b);
  saveStateFor(wk, st); render();
}
function addExercise(dayIdx, blockIdx){
  const name = prompt("Nombre del ejercicio:");
  if(!name) return;
  const target = prompt("Objetivo (p.ej., 3 x 10–12):","");
  const wk = getActiveWeek();
  const st = loadStateFor(wk);
  const ex = { name, target, sets:[{w:"",r:""},{w:"",r:""},{w:"",r:""}] };
  st.days[dayIdx].blocks[blockIdx].exercises = st.days[dayIdx].blocks[blockIdx].exercises || [];
  st.days[dayIdx].blocks[blockIdx].exercises.push(ex);
  saveStateFor(wk, st); render();
}
function delBlock(dayIdx, blockIdx){
  const wk = getActiveWeek(); const st = loadStateFor(wk);
  st.days[dayIdx].blocks.splice(blockIdx,1);
  saveStateFor(wk, st); render();
}
function dupExercise(dayIdx, blockIdx, exIdx){
  const wk=getActiveWeek(); const st=loadStateFor(wk);
  const arr = st.days[dayIdx].blocks[blockIdx].exercises || [];
  const copy = JSON.parse(JSON.stringify(arr[exIdx]));
  arr.splice(exIdx+1,0,copy);
  saveStateFor(wk, st); render();
}
function delExercise(dayIdx, blockIdx, exIdx){
  const wk=getActiveWeek(); const st=loadStateFor(wk);
  const arr = st.days[dayIdx].blocks[blockIdx].exercises || [];
  arr.splice(exIdx,1);
  saveStateFor(wk, st); render();
}
function addSet(dayIdx, blockIdx, exIdx){
  const wk=getActiveWeek(); const st=loadStateFor(wk);
  const ex = st.days[dayIdx].blocks[blockIdx].exercises[exIdx];
  ex.sets = ex.sets || [];
  ex.sets.push({w:"",r:""});
  saveStateFor(wk, st); render();
}
function removeSet(dayIdx, blockIdx, exIdx){
  const wk=getActiveWeek(); const st=loadStateFor(wk);
  const ex = st.days[dayIdx].blocks[blockIdx].exercises[exIdx];
  if(ex.sets && ex.sets.length>0){ ex.sets.pop(); saveStateFor(wk, st); render(); }
}

// Notes modal
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalTextarea = document.getElementById("modalTextarea");
document.getElementById("modalCancel").onclick = ()=> modal.classList.add("hidden");
let modalCtx = null;
document.getElementById("modalSave").onclick = ()=>{
  if(!modalCtx) return;
  const { dayIdx, blockIdx } = modalCtx;
  const wk = getActiveWeek();
  const st = loadStateFor(wk);
  st.days[dayIdx].blocks[blockIdx].notes = modalTextarea.value;
  saveStateFor(wk, st);
  modal.classList.add("hidden");
  renderHistory();
};
function openNotes(dayIdx, blockIdx){
  const wk = getActiveWeek();
  const st = loadStateFor(wk);
  const b = st.days[dayIdx].blocks[blockIdx];
  modalCtx = { dayIdx, blockIdx };
  modalTitle.textContent = `Sensaciones — ${st.days[dayIdx].name} · ${b.type}`;
  modalTextarea.value = b.notes || "";
  modal.classList.remove("hidden");
}

// Biometrics
function saveBiometrics(){
  const wk = getActiveWeek();
  const st = loadStateFor(wk);
  st.biometrics[wk] = {
    peso: document.querySelector("#peso").value,
    sueno: document.querySelector("#sueno").value,
    energia: document.querySelector("#energia").value,
    estres: document.querySelector("#estres").value,
    fcr: document.querySelector("#fcr").value,
    notas: document.querySelector("#bioNotas").value,
  };
  saveStateFor(wk, st);
  alert("Biomarcadores guardados");
  renderHistory();
}
function loadBiometrics(){
  const wk = getActiveWeek();
  const st = loadStateFor(wk);
  const bm = st.biometrics[wk] || {};
  document.querySelector("#peso").value = bm.peso || "";
  document.querySelector("#sueno").value = bm.sueno || "";
  document.querySelector("#energia").value = bm.energia || "";
  document.querySelector("#estres").value = bm.estres || "";
  document.querySelector("#fcr").value = bm.fcr || "";
  document.querySelector("#bioNotas").value = bm.notas || "";
}

// History
function renderHistory(){
  const container = document.querySelector("#history");
  container.innerHTML = "";
  const weeks = listWeeks();
  if(weeks.length===0){ container.textContent = "Sin semanas guardadas."; return; }

  weeks.forEach(wk => {
    const st = loadStateFor(wk);
    const bm = st.biometrics[wk] || {};
    const card = document.createElement("div");
    card.className = "chart-card";
    card.innerHTML = `
      <h3>Semana que empieza ${wk}</h3>
      <p><strong>Biomarcadores:</strong> Peso ${bm.peso||"–"} kg · Sueño ${bm.sueno||"–"} h · Energía ${bm.energia||"–"}/5 · Estrés ${bm.estres||"–"}/5 · FCR ${bm.fcr||"–"} ppm</p>
      <p><strong>Notas de sensaciones semanales:</strong><br>${(bm.notas||"—").replace(/\n/g,"<br>")}</p>
      ${st.days.map((d,di)=>`
        <details>
          <summary><strong>${d.name}</strong></summary>
          ${d.blocks.map((b,bi)=>`
            <div style="margin:6px 0;padding:6px;border-left:3px solid #ddd">
              <div><em>${b.type}</em> ${b.done?"✅":""}</div>
              ${b.walk ? walkSummary(b) : ""}
              ${b.exercises && b.exercises.length ? `
                <ul>
                  ${b.exercises.map(ex=>`<li>${ex.name} — ${ex.target||""} ${formatSetsInline(ex.sets)}</li>`).join("")}
                </ul>` : ""}
              ${b.notes ? `<div><strong>Sensaciones del bloque:</strong><br>${escapeHtml(b.notes).replace(/\n/g,"<br>")}</div>` : ""}
            </div>
          `).join("")}
        </details>
      `).join("")}
    `;
    container.appendChild(card);
  });
}
function walkSummary(b){
  const wd = b.walkData || {};
  const t = wd.tiempo? `${wd.tiempo} min`:"–";
  const d = wd.distancia? `${wd.distancia} km`:"–";
  const f = wd.fc? `${wd.fc} ppm`:"–";
  const s = wd.sensaciones? `<div><strong>Sensaciones caminata:</strong><br>${escapeHtml(wd.sensaciones).replace(/\n/g,"<br>")}</div>`:"";
  return `<div><strong>Caminata:</strong> ${t} · ${d} · FC ${f}${s?("<br>"+s):""}</div>`;
}
function formatSetsInline(sets){
  if(!sets || !sets.length) return "";
  const clean = sets.map(s=> (s && (s.w || s.r)) ? `${s.w||""}x${s.r||""}` : "").filter(Boolean);
  return clean.length ? `(${clean.join(" · ")})` : "";
}
function escapeHtml(str){ return (str||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

// Charts
function drawCharts(){ drawPesoChart(); drawVolChart(); drawWalkCharts(); }
function getWeeksSorted(){ return listWeeks().sort(); }
function drawPesoChart(){
  const canvas = document.getElementById("pesoChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const weeks = getWeeksSorted();
  const ys = weeks.map(wk => {
    const st = loadStateFor(wk); const bm = st.biometrics[wk] || {};
    const v = parseFloat(bm.peso); return isNaN(v)?null:v;
  });
  drawLineChart(ctx, weeks, ys, { yLabel:"kg" });
}
function drawVolChart(){
  const canvas = document.getElementById("volChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const weeks = getWeeksSorted();
  const ys = weeks.map(wk => computeWeeklyVolume(loadStateFor(wk)));
  drawBarChart(ctx, weeks, ys, { yLabel:"kg·reps" });
}
function drawWalkCharts(){
  const weeks = getWeeksSorted();
  const totals = weeks.map(wk => walkTotalsFor(loadStateFor(wk)));
  const timeCanvas = document.getElementById("walkTimeChart").getContext("2d");
  const distCanvas = document.getElementById("walkDistChart").getContext("2d");
  clearCtx(timeCanvas); clearCtx(distCanvas);

  const timeVals = totals.map(t => t.time);
  const distVals = totals.map(t => t.dist);
  const hrVals = totals.map(t => t.hrAvg).filter(v=>!isNaN(v));

  drawLineChart(timeCanvas, weeks, timeVals, { yLabel:"min" });
  drawLineChart(distCanvas, weeks, distVals, { yLabel:"km" });

  const hrAvg = hrVals.length ? Math.round(hrVals.reduce((a,b)=>a+b,0)/hrVals.length) : NaN;
  const p = document.getElementById("walkHrAvg");
  p.textContent = isNaN(hrAvg) ? "FC media semanal: —" : `FC media semanal (promedio entre semanas con dato): ${hrAvg} ppm`;
}
function clearCtx(ctx){ ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height); }
function walkTotalsFor(state){
  let time=0, dist=0, hrSum=0, hrN=0;
  state.days.slice(0,5).forEach(d => d.blocks.forEach(b => {
    if(b.walk && b.walkData){
      const t = parseFloat(b.walkData.tiempo); if(!isNaN(t)) time += t;
      const dd = parseFloat(b.walkData.distancia); if(!isNaN(dd)) dist += dd;
      const hh = parseFloat(b.walkData.fc); if(!isNaN(hh)) { hrSum += hh; hrN += 1; }
    }
  }));
  return { time: Math.round(time), dist: Math.round(dist*100)/100, hrAvg: hrN? hrSum/hrN : NaN };
}
function computeWeeklyVolume(state){
  let total = 0;
  state.days.forEach(d => d.blocks.forEach(b => (b.exercises||[]).forEach(ex => {
    (ex.sets||[]).forEach(s => {
      const w = parseFloat(s?.w);
      const r = parseFloat(s?.r);
      if(!isNaN(w) && !isNaN(r)) total += w*r;
    });
  })));
  return Math.round(total);
}
function drawAxes(ctx, w, h, padding, yMin, yMax, yLabel){
  ctx.strokeStyle = "#888"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padding, padding); ctx.lineTo(padding, h - padding); ctx.lineTo(w - padding, h - padding); ctx.stroke();
  const ticks = 5; ctx.fillStyle = "#333"; ctx.font = "12px system-ui";
  for(let i=0;i<=ticks;i++){
    const yv = yMin + (i*(yMax-yMin))/ticks;
    const y = mapY(yv, yMin, yMax, h, padding);
    ctx.fillText(String(Math.round(yv)), 6, y+4);
    ctx.strokeStyle = "#eee"; ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w - padding, y); ctx.stroke();
  }
  ctx.save(); ctx.translate(14, h/2); ctx.rotate(-Math.PI/2); ctx.fillStyle = "#555"; ctx.fillText(yLabel||"", 0, 0); ctx.restore();
}
function mapY(v, yMin, yMax, h, padding){
  const innerH = h - 2*padding; const t = (v - yMin) / (yMax - yMin || 1);
  return (h - padding) - t*innerH;
}
function mapX(i, count, w, padding){
  const innerW = w - 2*padding; if(count<=1) return padding;
  return padding + (i * innerW)/(count-1);
}
function drawLineChart(ctx, labels, values, { yLabel }={}){
  const w = ctx.canvas.width, h = ctx.canvas.height, pad = 36;
  const vals = values.filter(v=>v!=null);
  const yMin = vals.length? Math.min(...vals)*0.98 : 0;
  const yMax = vals.length? Math.max(...vals)*1.02 : 1;
  drawAxes(ctx, w, h, pad, yMin, yMax, yLabel||"");
  ctx.strokeStyle = "#2a6"; ctx.lineWidth = 2; ctx.beginPath();
  values.forEach((v,i)=>{ if(v==null) return; const x=mapX(i,values.length,w,pad), y=mapY(v,yMin,yMax,h,pad); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  ctx.fillStyle = "#2a6";
  values.forEach((v,i)=>{ if(v==null) return; const x=mapX(i,values.length,w,pad), y=mapY(v,yMin,yMax,h,pad); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = "#333"; ctx.font = "12px system-ui";
  labels.forEach((lab,i)=>{ const x=mapX(i,labels.length,w,pad); ctx.save(); ctx.translate(x,h-10); ctx.rotate(-Math.PI/4); ctx.fillText(lab,0,0); ctx.restore(); });
}
function drawBarChart(ctx, labels, values, { yLabel }={}){
  const w=ctx.canvas.width, h=ctx.canvas.height, pad=36;
  const yMin=0, yMax=Math.max(10, Math.max(...values,0)*1.2);
  drawAxes(ctx, w, h, pad, yMin, yMax, yLabel||"");
  const innerW = w - 2*pad; const barW = Math.max(8, innerW / (values.length*1.5));
  ctx.fillStyle = "#06c";
  values.forEach((v,i)=>{ const x=pad + i*(barW*1.5); const y=mapY(v,yMin,yMax,h,pad); const base=mapY(0,yMin,yMax,h,pad); ctx.fillRect(x,y,barW,base-y); });
  ctx.fillStyle = "#333"; ctx.font = "12px system-ui";
  labels.forEach((lab,i)=>{ const x=pad + i*(barW*1.5) + barW/2; ctx.save(); ctx.translate(x,h-10); ctx.rotate(-Math.PI/4); ctx.fillText(lab,0,0); ctx.restore(); });
}

// Export/Import
function exportAll(){
  const all = loadAll();
  const blob = new Blob([JSON.stringify(all, null, 2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "entrenos_todas_las_semanas.json"; a.click();
}
function exportWeekReport(){
  const wk = getActiveWeek();
  const st = loadStateFor(wk);
  const bm = st.biometrics[wk] || {};
  const walk = walkTotalsFor(st);
  const lines = [];
  lines.push(`Reporte semana ${wk}`);
  lines.push("");
  lines.push(`Peso: ${bm.peso||"–"} kg | Sueño: ${bm.sueno||"–"} h | Energía: ${bm.energia||"–"}/5 | Estrés: ${bm.estres||"–"}/5 | FCR: ${bm.fcr||"–"} ppm`);
  lines.push(`Caminatas (L–V): Tiempo ${walk.time} min · Dist ${walk.dist} km · FC media ${isNaN(walk.hrAvg)?"—":Math.round(walk.hrAvg)+" ppm"}`);
  lines.push(`Volumen (kg·reps): ${computeWeeklyVolume(st)}`);
  lines.push("");
  st.days.forEach(d=>{
    lines.push(`== ${d.name} ==`);
    d.blocks.forEach(b=>{
      lines.push(`- ${b.type}${b.done?" ✅":""}`);
      if(b.walk && b.walkData){
        lines.push(`  Caminata: ${b.walkData.tiempo||"–"} min · ${b.walkData.distancia||"–"} km · FC ${b.walkData.fc||"–"} ppm`);
        if(b.walkData.sensaciones) lines.push(`  Sensaciones caminata: ${b.walkData.sensaciones.replace(/\n/g," ")}`);
      }
      (b.exercises||[]).forEach(ex=>{
        const sets = (ex.sets||[]).map(s=> (s && (s.w||s.r)) ? `${s.w||""}x${s.r||""}` : "").filter(Boolean).join(" · ");
        lines.push(`  • ${ex.name} — ${ex.target||""} ${sets? "(" + sets + ")": ""}`);
      });
      if(b.notes) lines.push(`  Sensaciones bloque: ${b.notes.replace(/\n/g," ")}`);
    });
    lines.push("");
  });
  if(bm.notas){ lines.push("Notas semanales:"); lines.push(bm.notas); lines.push(""); }
  const txt = lines.join("\n");
  const blob = new Blob([txt], {type:"text/plain"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `reporte_${wk}.txt`; a.click();
}
function importAll(e){
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => { try{
      const obj = JSON.parse(reader.result);
      if(typeof obj === "object"){ saveAll(obj); const weeks = Object.keys(obj); if(weeks.length){ setActiveWeek(weeks.sort().pop()); } refreshWeekPicker(getActiveWeek()); render(); renderHistory(); drawCharts(); alert("Datos importados correctamente"); }
      else alert("Archivo inválido");
    }catch{ alert("Archivo inválido"); } };
  reader.readAsText(file);
}
function duplicateWeek(){
  const wk = getActiveWeek(); if(!wk) return;
  const all = loadAll(); const src = JSON.parse(JSON.stringify(all[wk]));
  const d = new Date(wk); d.setDate(d.getDate()+7); const newWk = d.toISOString().slice(0,10);
  src.weekStart = newWk; all[newWk] = src; saveAll(all); setActiveWeek(newWk);
  refreshWeekPicker(newWk); render(); renderHistory(); alert("Semana duplicada");
}
function resetAll(){
  if(!confirm("¿Seguro que quieres borrar todos los datos locales?")) return;
  localStorage.removeItem("sergio-weeks"); localStorage.removeItem("sergio-active-week"); init();
}

// ===== Daily summary builder =====
function openDailySummary(dayIdx){
  const wk = getActiveWeek();
  const st = loadStateFor(wk);
  const day = st.days[dayIdx];
  const parts = [];
  parts.push(`Semana ${wk} — ${day.name}`);

  // Caminata(s) de ese día
  const walks = day.blocks.filter(b => b.walk && b.walkData);
  walks.forEach((b, i) => {
    const wd = b.walkData;
    const t = wd.tiempo ? `${wd.tiempo} min` : "–";
    const d = wd.distancia ? `${wd.distancia} km` : "–";
    const f = wd.fc ? `${wd.fc} ppm` : "–";
    parts.push(`Caminata${walks.length>1?` ${i+1}`:""}: ${t} · ${d} · FC ${f}`);
    if(wd.sensaciones) parts.push(`  Sensaciones caminata: ${wd.sensaciones.replace(/\n/g," ")}`);
  });

  // Bloques de fuerza/HIIT/etc.
  day.blocks.filter(b=>!b.walk).forEach(b => {
    parts.push(`${b.type}${b.done ? " ✅" : ""}`);
    (b.exercises||[]).forEach(ex=>{
      const sets = (ex.sets||[]).map(s=> (s && (s.w||s.r)) ? `${s.w||""}x${s.r||""}` : "").filter(Boolean).join(" · ");
      parts.push(`  • ${ex.name} — ${ex.target||""} ${sets? "(" + sets + ")": ""}`);
    });
    if(b.notes) parts.push(`  Sensaciones: ${b.notes.replace(/\n/g," ")}`);
  });

  // Biomarcador del peso si quieres incluirlo en el día (opcional)
  const bm = st.biometrics[wk] || {};
  if(bm.peso) parts.push(`Peso semanal registrado: ${bm.peso} kg`);

  const txt = parts.join("\n");
  const modal = document.getElementById("modalShare");
  document.getElementById("shareTextarea").value = txt;
  document.getElementById("shareTitle").textContent = `Resumen diario — ${day.name}`;
  modal.dataset.dayidx = dayIdx;
  modal.classList.remove("hidden");
}

// Kick off
init();