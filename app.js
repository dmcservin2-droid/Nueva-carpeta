(() => {
  const LICENSE='nota_clara_paid_v1';
  if(localStorage.getItem(LICENSE)!=='true'){ location.replace('index.html?compra=1'); return; }

  const COLORS=['note1','note2','note3','note4','note5','note6','note7','note8'];
  const COLOR_CSS=['var(--note1)','var(--note2)','var(--note3)','var(--note4)','var(--note5)','var(--note6)','var(--note7)','var(--note8)'];
  const DB_NAME='nota-clara-db', STORE='notes';
  let db, notes=[], current=null, tab='notes', sort='new', view='grid', query='', saveTimer=null;

  const $=s=>document.querySelector(s);
  const list=$('#notesList'), back=$('#editorBack'), modal=$('#editorModal'), title=$('#titleInput'), body=$('#bodyInput');
  const toastEl=$('#toast'), state=$('#saveState');

  function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),1800)}
  function openDb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=e=>res(e.target.result);r.onerror=()=>rej(r.error)})}
  function tx(mode='readonly'){return db.transaction(STORE,mode).objectStore(STORE)}
  function allNotes(){return new Promise((res,rej)=>{const r=tx().getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
  function put(n){return new Promise((res,rej)=>{const r=tx('readwrite').put(n);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
  function del(id){return new Promise((res,rej)=>{const r=tx('readwrite').delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
  function uuid(){return crypto.randomUUID?crypto.randomUUID():'n-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
  function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function fmt(ts){try{return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(ts)}catch{return''}}
  function colorOf(c){const i=COLORS.indexOf(c);return COLOR_CSS[i<0?0:i]}

  async function load(){notes=await allNotes();render()}
  function filtered(){
    let arr=notes.filter(n=>tab==='trash'?n.trashed:!n.trashed);
    if(query){const q=query.toLowerCase();arr=arr.filter(n=>(n.title+' '+n.content).toLowerCase().includes(q))}
    arr.sort((a,b)=>sort==='new'?b.updatedAt-a.updatedAt:a.updatedAt-b.updatedAt);
    if(tab==='notes')arr.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
    return arr;
  }
  function render(){
    const arr=filtered();
    $('#trashCount').textContent=notes.filter(n=>n.trashed).length?`(${notes.filter(n=>n.trashed).length})`:'';
    $('#newBtn').style.display=tab==='notes'?'block':'none';
    list.className='note-list '+view;
    if(!arr.length){list.innerHTML=`<div class="empty">${query?'Nada coincide con tu búsqueda.':tab==='trash'?'La papelera está vacía.':'Tu primera idea empieza aquí.'}</div>`;return}
    list.innerHTML=arr.map(n=>`<article class="app-note" style="background:${colorOf(n.color)}" data-id="${n.id}">
      ${tab==='notes'?`<button class="pin" data-pin="${n.id}" title="${n.pinned?'Desfijar':'Fijar'}">${n.pinned?'◆':'◇'}</button>`:''}
      <h3>${esc(n.title||'Sin título')}</h3><p>${esc(n.content||'')}</p>
      <div class="meta"><span>${fmt(n.updatedAt)}</span>${tab==='trash'?`<span><button class="restore" data-restore="${n.id}">Restaurar</button> <button class="restore" data-delete="${n.id}">Borrar</button></span>`:'<span>Abrir</span>'}</div>
    </article>`).join('');
  }

  async function createNote(){const now=Date.now();current={id:uuid(),title:'',content:'',color:'note1',pinned:false,trashed:false,createdAt:now,updatedAt:now};await put(current);notes.push(current);render();openEditor(current)}
  function openEditor(n){current={...n};title.value=current.title;body.value=current.content;modal.style.background=colorOf(current.color);$('#pinBtn').textContent=current.pinned?'Desfijar':'Fijar';buildSwatches();back.classList.add('open');setTimeout(()=>title.focus(),40)}
  function buildSwatches(){$('#swatches').innerHTML=COLORS.map((c,i)=>`<button class="sw ${current.color===c?'active':''}" style="background:${COLOR_CSS[i]}" data-color="${c}" aria-label="Color ${i+1}"></button>`).join('')}
  function queueSave(){if(!current)return;current.title=title.value;current.content=body.value;current.updatedAt=Date.now();state.textContent='Guardando…';clearTimeout(saveTimer);saveTimer=setTimeout(saveCurrent,350)}
  async function saveCurrent(){if(!current)return;clearTimeout(saveTimer);await put(current);const i=notes.findIndex(n=>n.id===current.id);if(i>=0)notes[i]={...current};state.textContent='Guardado';render()}
  async function closeEditor(){if(!current)return;await saveCurrent();back.classList.remove('open');current=null}

  list.addEventListener('click',async e=>{
    const pin=e.target.closest('[data-pin]'); if(pin){e.stopPropagation();const n=notes.find(x=>x.id===pin.dataset.pin);n.pinned=!n.pinned;n.updatedAt=Date.now();await put(n);render();return}
    const rs=e.target.closest('[data-restore]'); if(rs){e.stopPropagation();const n=notes.find(x=>x.id===rs.dataset.restore);n.trashed=false;n.updatedAt=Date.now();await put(n);render();toast('Nota restaurada');return}
    const dd=e.target.closest('[data-delete]'); if(dd){e.stopPropagation();if(confirm('¿Borrar esta nota definitivamente?')){await del(dd.dataset.delete);notes=notes.filter(n=>n.id!==dd.dataset.delete);render();toast('Nota eliminada')}return}
    const card=e.target.closest('.app-note'); if(card&&tab==='notes'){const n=notes.find(x=>x.id===card.dataset.id);if(n)openEditor(n)}
  });

  $('#newBtn').onclick=createNote;
  title.addEventListener('input',queueSave); body.addEventListener('input',queueSave);
  $('#closeBtn').onclick=closeEditor;
  back.addEventListener('click',e=>{if(e.target===back)closeEditor()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&back.classList.contains('open'))closeEditor()});
  $('#pinBtn').onclick=()=>{current.pinned=!current.pinned;$('#pinBtn').textContent=current.pinned?'Desfijar':'Fijar';queueSave()};
  $('#trashBtn').onclick=async()=>{current.trashed=true;current.pinned=false;await saveCurrent();back.classList.remove('open');current=null;render();toast('Nota movida a la papelera')};
  $('#swatches').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;current.color=b.dataset.color;modal.style.background=colorOf(current.color);buildSwatches();queueSave()});
  $('#searchInput').addEventListener('input',e=>{query=e.target.value;render()});
  $('#sortBtn').onclick=e=>{sort=sort==='new'?'old':'new';e.currentTarget.textContent=sort==='new'?'Recientes ↓':'Antiguas ↑';render()};
  $('#viewBtn').onclick=e=>{view=view==='grid'?'list':'grid';e.currentTarget.textContent=view==='grid'?'Cuadrícula':'Lista';render()};
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');tab=b.dataset.tab;render()});

  $('#exportBtn').onclick=()=>{const payload={app:'Nota Clara',version:1,exportedAt:new Date().toISOString(),notes};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nota-clara-respaldo-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Respaldo exportado')};
  $('#importBtn').onclick=()=>$('#importFile').click();
  $('#importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());const arr=Array.isArray(data)?data:data.notes;if(!Array.isArray(arr))throw Error();for(const raw of arr){if(!raw||typeof raw!=='object')continue;const now=Date.now();const n={id:String(raw.id||uuid()),title:String(raw.title||'').slice(0,500),content:String(raw.content||''),color:COLORS.includes(raw.color)?raw.color:'note1',pinned:!!raw.pinned,trashed:!!raw.trashed,createdAt:Number(raw.createdAt)||now,updatedAt:Number(raw.updatedAt)||now};await put(n)}await load();toast('Respaldo importado')}catch{alert('Ese archivo no parece un respaldo válido de Nota Clara.')}e.target.value=''};
  $('#themeBtn').onclick=()=>{document.documentElement.classList.toggle('dark');localStorage.setItem('nota_clara_theme',document.documentElement.classList.contains('dark')?'dark':'light')};
  if(localStorage.getItem('nota_clara_theme')==='dark')document.documentElement.classList.add('dark');

  openDb().then(d=>{db=d;return load()}).catch(()=>{list.innerHTML='<div class="empty">No pudimos abrir el almacenamiento local del navegador.</div>'});
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();