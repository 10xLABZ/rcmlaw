const S={clients:'rlaw_clients_v4',cases:'rlaw_cases_v4',contact:'rlaw_contact_v4',notes:'rlaw_notes_v4',tasks:'rlaw_tasks_v4',payments:'rlaw_payments_v4',invoices:'rlaw_invoices_v4',docs:'rlaw_docs_v4',courtDates:'rlaw_court_dates_v1',legalDates:'rlaw_legal_dates_v1',opposing:'rlaw_opposing_counsel_v1',settings:'rlaw_settings_v4'};
const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}},
save=async(k,v)=>{const raw=JSON.stringify(v);localStorage.setItem(k,raw);if(window.desktopPersist){const r=await window.desktopPersist(k,raw);if(r && r.ok===false)throw new Error(r.error||'Cloud save failed.');return r}return {ok:true,local_only:true}},
loadObj=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return{}}};
const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7), qs=n=>new URLSearchParams(location.search).get(n), now=()=>new Date().toISOString();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cname=c=>[c?.firstName,c?.lastName].filter(Boolean).join(' ')||'Unnamed Client', getClient=id=>load(S.clients).find(x=>x.id===id), getCase=id=>load(S.cases).find(x=>x.id===id);
function money(n){let x=Number(String(n??'').replace(/[$,]/g,''));return Number.isFinite(x)?x.toLocaleString('en-US',{style:'currency',currency:'USD'}):'—'}
function fmt(d){if(!d)return'—';let x=new Date(d+'T12:00:00');return x.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
function toast(m){let t=document.getElementById('toast');if(t){t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',1800)}}
function navActive(){let p=location.pathname.split('/').pop()||'index.html';document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===p))}
function statusClass(s){s=String(s||'').toLowerCase();return s==='active'?'status-active':s==='closed'?'status-closed':'status-pending'}
function requiredCase(f){return ['caseType','caseStatus'].filter(k=>!String(f.elements[k]?.value||'').trim()).map(k=>k==='caseType'?'Case Type':'Case Status')}
function getDates(){
  const clients=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c])),r=[];
  load(S.courtDates).filter(x=>!x.done&&x.date).forEach(x=>{const cs=cases[x.caseId]||{},c=clients[x.clientId||cs.clientId]||{};r.push({caseId:x.caseId,date:x.date,time:x.time||'',kind:'Court',title:x.type||x.note||'Court date',client:cname(c)})});
  load(S.legalDates).filter(x=>!x.done&&x.date).forEach(x=>{const cs=cases[x.caseId]||{},c=clients[x.clientId||cs.clientId]||{};r.push({caseId:x.caseId,date:x.date,time:x.time||'',kind:'Appointment',title:x.type||x.note||'Appointment',client:cname(c)})});
  // Legacy fallback until an old single next-date field has been converted into history.
  Object.values(cases).forEach(cs=>{let c=clients[cs.clientId]||{};if(cs.nextCourtDate&&!load(S.courtDates).some(x=>x.caseId===cs.id))r.push({caseId:cs.id,date:cs.nextCourtDate,kind:'Court',title:cs.nextCourtDateNote||'Court date',client:cname(c)});if(cs.nextLegalDate&&!load(S.legalDates).some(x=>x.caseId===cs.id))r.push({caseId:cs.id,date:cs.nextLegalDate,kind:'Appointment',title:cs.nextLegalDateNote||'Appointment',client:cname(c)})});
  return r.sort((a,b)=>a.date.localeCompare(b.date));
}
function fmtTime(t){if(!t)return '';const m=String(t).match(/^(\d{1,2}):(\d{2})/);if(!m)return String(t);let h=Number(m[1]),min=m[2],ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${min} ${ap}`}
function dashTimeParts(t){if(!t)return null;const m=String(t).match(/^(\d{1,2}):(\d{2})/);if(!m)return null;let h=Number(m[1]),min=m[2],ap=h>=12?'PM':'AM';h=h%12||12;return {hour:String(h).padStart(2,'0'),minute:min,ap}}
function getCalendarItems(){let r=getDates();load(S.tasks).filter(t=>!t.done&&t.dueDate).forEach(t=>r.push({caseId:t.caseId,date:t.dueDate,kind:'Task',title:t.text||'Task due',client:t.clientName||cname(getClient(t.clientId))}));return r.sort((a,b)=>a.date.localeCompare(b.date))}
function nextInvoiceNumber(){let nums=load(S.invoices).map(i=>parseInt(String(i.number||'').replace(/\D/g,''),10)).filter(n=>Number.isFinite(n)&&n>=1000);return String(nums.length?Math.max(...nums)+1:1000)}
function setNextInvoiceNumber(){let e=document.getElementById('invoiceNumber');if(e)e.value=nextInvoiceNumber()}
function globalSearchGo(){let q=document.getElementById('globalSearch').value.trim();location.href='clients.html'+(q?'?q='+encodeURIComponent(q):'')}

function dashboardInit(){let clients=load(S.clients),cases=load(S.cases),tasks=load(S.tasks).filter(t=>!t.done),dates=getDates();statClients.textContent=clients.length;statCases.textContent=cases.filter(c=>c.caseStatus==='Active').length;statDates.textContent=dates.length;statTasks.textContent=tasks.length;let cb=document.getElementById('recentClientsBody');cb.innerHTML=clients.slice(-5).reverse().map(c=>`<tr><td><a class="link" href="client-profile.html?id=${c.id}">${esc(cname(c))}</a></td><td>${esc(c.phone||'—')}</td><td>${esc(c.email||'—')}</td></tr>`).join('');let up=getDates().filter(x=>new Date(x.date+'T12:00:00')>=new Date().setHours(0,0,0,0)).slice(0,10);upcomingDatesList.innerHTML=up.map(x=>{const dp=String(x.date||'').split('-'),dt=new Date(x.date+'T12:00:00'),mon=dt.toLocaleDateString('en-US',{month:'short'}).toUpperCase(),day=dp[2]||'',kind=x.kind==='Court'?'COURT':'APPT';return `<a class="dash-list-row appointment-card" href="case-detail.html?id=${x.caseId}"><div class="appt-kind">${kind}</div><div class="appt-date"><b class="appt-month">${esc(mon)}</b><strong class="appt-day">${esc(day)}</strong><span class="appt-time">${esc(fmtTime(x.time)||'—')}</span></div><div class="dash-grow appt-copy"><strong>${esc(x.client)}</strong><div class="sub">${esc(x.title)}</div></div><span class="appt-chevron" aria-hidden="true">›</span></a>`}).join('')||'<div class="empty"><strong>No upcoming dates.</strong></div>';tasksDueList.innerHTML=tasks.slice(0,6).map(t=>`<a class="dash-list-row" href="case-detail.html?id=${t.caseId}"><div class="priority-dot ${String(t.priority||'').toLowerCase()}"></div><div class="dash-grow"><strong>${esc(t.text)}</strong><div class="sub">${esc(t.clientName||'')} ${t.dueDate?'• '+fmt(t.dueDate):''}</div></div><span class="priority-label">${esc(t.priority||'')}</span></a>`).join('')||'<div class="empty"><strong>No tasks due.</strong></div>';let notes=[...load(S.notes).map(n=>({...n,kind:'Case Note'})),...load(S.contact).map(n=>({...n,kind:'Contact Update'}))].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,5);recentNotesList.innerHTML=notes.map(n=>{const href=n.caseId?`case-detail.html?id=${n.caseId}`:`client-profile.html?id=${n.clientId}`;return `<a class="dash-list-row" href="${href}"><div class="dash-grow"><strong>${esc(n.text)}</strong><div class="sub">${esc(n.kind)} • ${new Date(n.createdAt).toLocaleDateString()}</div></div></a>`}).join('')||'<div class="empty"><strong>No notes yet.</strong></div>';let cm=Object.fromEntries(clients.map(c=>[c.id,c])),ac=cases.filter(c=>c.caseStatus==='Active');activeCasesBody.innerHTML=ac.slice(0,5).map(cs=>`<tr><td><a class="link" href="case-detail.html?id=${cs.id}">${esc(cname(cm[cs.clientId]))}</a></td><td>${esc(cs.caseType)}${cs.subCaseType?'<div class="sub">'+esc(cs.subCaseType)+'</div>':''}</td><td>${esc(cs.caseNumber||'—')}</td><td>${money(cs.serviceQuote)}</td></tr>`).join('');renderDashPayments()}
function renderDashPayments(){let ps=load(S.payments),cases=load(S.cases),cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),quote=0,paid=0,rows=cases.filter(c=>c.serviceQuote).map(cs=>{let q=+String(cs.serviceQuote).replace(/[$,]/g,'')||0,p=ps.filter(x=>x.caseId===cs.id).reduce((s,x)=>s+(+x.amount||0),0);quote+=q;paid+=p;return{cs,q,p,b:Math.max(0,q-p)}});paymentsBody.innerHTML=rows.slice(0,5).map(r=>`<tr><td>${esc(cname(cm[r.cs.clientId]))}</td><td>${money(r.q)}</td><td>${money(r.p)}</td><td>${money(r.b)}</td></tr>`).join('');totalQuote.textContent=money(quote);totalPaid.textContent=money(paid);totalBalance.textContent=money(Math.max(0,quote-paid))}

function addClientInit(){clientForm.addEventListener('submit',async e=>{e.preventDefault();let m=requiredCase(clientForm);if(m.length){alert('Please fill out:\n• '+m.join('\n• '));return}try{let f=new FormData(clientForm),c={id:uid('client'),createdAt:now(),updatedAt:now()};['firstName','lastName','phone','email','address','city','state','zip'].forEach(k=>c[k]=String(f.get(k)||'').trim());let clients=load(S.clients);clients.push(c);await save(S.clients,clients);let cs={id:uid('case'),clientId:c.id,createdAt:now(),updatedAt:now()};['caseType','subCaseType','caseNumber','caseStatus','serviceQuote','court','judge','caseNotes','nextCourtDate','nextCourtDateNote','nextLegalDate','nextLegalDateNote'].forEach(k=>cs[k]=String(f.get(k)||'').trim());let cases=load(S.cases);cases.push(cs);await save(S.cases,cases);location.href='client-profile.html?id='+c.id}catch(err){alert('Could not save to cloud: '+err.message)}})}
let clientLetter='ALL';function clientsInit(){let input=clientSearch;input.value=qs('q')||'';document.querySelectorAll('#alphaTabs .tab').forEach(t=>t.onclick=()=>{clientLetter=t.dataset.letter;document.querySelectorAll('#alphaTabs .tab').forEach(x=>x.classList.toggle('active',x===t));drawClients()});input.addEventListener('input',drawClients);drawClients()}
function drawClients(){let input=document.getElementById('clientSearch'),q=(input?.value||'').toLowerCase(),cases=load(S.cases),rows=load(S.clients).filter(c=>{let last=(c.lastName||'').trim().toUpperCase(),letterOK=clientLetter==='ALL'||last.startsWith(clientLetter),searchOK=!q||[c.firstName,c.lastName,c.phone,c.email].join(' ').toLowerCase().includes(q)||cases.some(cs=>cs.clientId===c.id&&[cs.caseType,cs.subCaseType,cs.caseNumber,cs.caseNotes].join(' ').toLowerCase().includes(q));return letterOK&&searchOK}).sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||'')||(a.firstName||'').localeCompare(b.firstName||''));clientsBody.innerHTML=rows.map(c=>`<tr><td><a class="link" href="client-profile.html?id=${c.id}">${esc(cname(c))}</a></td><td>${esc(c.phone||'—')}</td><td>${esc(c.email||'—')}</td><td>${cases.filter(x=>x.clientId===c.id).length}</td><td>${esc([c.city,c.state].filter(Boolean).join(', ')||'—')}</td></tr>`).join('')||`<tr><td colspan="5" class="empty"><strong>No clients ${clientLetter==='ALL'?'found.':'with last names beginning with '+clientLetter+'.'}</strong></td></tr>`}
function clientProfileInit(){let id=qs('id'),clients=load(S.clients),c=clients.find(x=>x.id===id);clientName.textContent=cname(c);clientMeta.textContent=[c.phone,c.email].filter(Boolean).join(' • ');['firstName','lastName','phone','email','address','city','state','zip'].forEach(k=>document.getElementById(k).value=c[k]||'');clientInfoForm.addEventListener('submit',e=>{e.preventDefault();for(let[k,v]of new FormData(clientInfoForm).entries())c[k]=String(v).trim();c.updatedAt=now();save(S.clients,clients);toast('Client updated')});renderClientCases(id);renderContact(id);contactUpdateForm.addEventListener('submit',e=>{e.preventDefault();let f=new FormData(contactUpdateForm),rows=load(S.contact);rows.push({id:uid('contact'),clientId:id,type:String(f.get('type')),text:String(f.get('text')),createdAt:now()});save(S.contact,rows);contactUpdateForm.reset();renderContact(id)})}
function renderClientCases(id){let rows=load(S.cases).filter(c=>c.clientId===id);clientCasesBody.innerHTML=rows.map(cs=>`<tr><td><a class="link" href="case-detail.html?id=${cs.id}">${esc(cs.caseType)}${cs.subCaseType?'<div class="sub">'+esc(cs.subCaseType)+'</div>':''}</a></td><td>${esc(cs.caseNumber||'—')}</td><td><span class="${statusClass(cs.caseStatus)}">${esc(cs.caseStatus)}</span></td><td>${fmt(cs.nextCourtDate||cs.nextLegalDate)}</td><td>${money(cs.serviceQuote)}</td></tr>`).join('')}
function renderContact(id){let rows=load(S.contact).filter(x=>x.clientId===id).slice().reverse();contactUpdates.innerHTML=rows.map(x=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(x.type)}</strong><button class="btn btn-small btn-danger" onclick="delItem('${S.contact}','${x.id}',()=>renderContact('${id}'))">Delete</button></div><div class="sub">${new Date(x.createdAt).toLocaleString()}</div><div class="body">${esc(x.text)}</div></div>`).join('')||'<div class="empty"><strong>No contact updates.</strong></div>'}
function addCaseInit(){let cid=qs('clientId');caseClientName.textContent=cname(getClient(cid));addCaseForm.addEventListener('submit',async e=>{e.preventDefault();let m=requiredCase(addCaseForm);if(m.length){alert('Please fill out:\n• '+m.join('\n• '));return}try{let f=new FormData(addCaseForm),cs={id:uid('case'),clientId:cid,createdAt:now(),updatedAt:now()};for(let[k,v]of f.entries())cs[k]=String(v).trim();let rows=load(S.cases);rows.push(cs);await save(S.cases,rows);location.href='case-detail.html?id='+cs.id}catch(err){alert('Could not save case to cloud: '+err.message)}})}

function caseDetailInit(){let id=qs('id'),cases=load(S.cases),cs=cases.find(x=>x.id===id),c=getClient(cs.clientId);caseTitle.textContent=cs.caseType+(cs.subCaseType?' — '+cs.subCaseType:'');caseMeta.innerHTML=`<a class="link" href="client-profile.html?id=${cs.clientId}">${esc(cname(c))}</a> • ${esc(cs.caseNumber||'No case #')}`;['caseType','subCaseType','caseNumber','caseStatus','serviceQuote','court','judge','caseNotes','nextCourtDate','nextCourtDateNote','nextLegalDate','nextLegalDateNote'].forEach(k=>{const el=document.getElementById(k);if(el)el.value=cs[k]||''});caseStatusDisplay.textContent=cs.caseStatus;caseStatusDisplay.className=statusClass(cs.caseStatus);caseForm.addEventListener('submit',e=>{e.preventDefault();for(let[k,v]of new FormData(caseForm).entries())cs[k]=String(v).trim();cs.updatedAt=now();save(S.cases,cases);caseStatusDisplay.textContent=cs.caseStatus;caseStatusDisplay.className=statusClass(cs.caseStatus);toast('Case updated')});setupCaseForms(cs,c);renderCaseLists(id);setNextInvoiceNumber()}
function setupCaseForms(cs,c){caseNoteForm.addEventListener('submit',e=>{e.preventDefault();let f=new FormData(caseNoteForm),rows=load(S.notes);rows.push({id:uid('note'),caseId:cs.id,clientId:cs.clientId,text:String(f.get('text')),createdAt:now()});save(S.notes,rows);caseNoteForm.reset();renderCaseNotes(cs.id)});taskForm.addEventListener('submit',e=>{e.preventDefault();let f=new FormData(taskForm),rows=load(S.tasks);rows.push({id:uid('task'),caseId:cs.id,clientId:cs.clientId,clientName:cname(c),text:String(f.get('text')),dueDate:String(f.get('dueDate')),priority:String(f.get('priority')),done:false,createdAt:now()});save(S.tasks,rows);taskForm.reset();renderTasks(cs.id)});paymentForm.addEventListener('submit',e=>{e.preventDefault();let f=new FormData(paymentForm),rows=load(S.payments);rows.push({id:uid('pay'),caseId:cs.id,clientId:cs.clientId,amount:+f.get('amount'),date:String(f.get('date')),method:String(f.get('method')),reference:String(f.get('reference')),note:String(f.get('note')),invoiceId:String(f.get('invoiceId')),createdAt:now()});save(S.payments,rows);paymentForm.reset();renderPayments(cs.id);renderInvoices(cs.id)});invoiceForm.addEventListener('submit',e=>{e.preventDefault();let f=new FormData(invoiceForm),rows=load(S.invoices);rows.push({id:uid('inv'),caseId:cs.id,clientId:cs.clientId,number:nextInvoiceNumber(),date:String(f.get('date')),dueDate:String(f.get('dueDate')),description:String(f.get('description')),amount:+f.get('amount'),status:String(f.get('status')),note:String(f.get('note')),createdAt:now()});save(S.invoices,rows);invoiceForm.reset();setNextInvoiceNumber();renderInvoices(cs.id);renderPayments(cs.id)});docForm.addEventListener('submit',async e=>{e.preventDefault();await attachDoc(cs,c)})}
function renderCaseLists(id){renderCaseNotes(id);renderTasks(id);renderPayments(id);renderInvoices(id);renderDocs(id)}
function renderCaseNotes(id){let rows=load(S.notes).filter(x=>x.caseId===id).slice().reverse();caseNotesList.innerHTML=rows.map(n=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>Case Note</strong><div><button class="btn btn-small btn-secondary" onclick="editNote('${n.id}')">Edit</button> <button class="btn btn-small btn-danger" onclick="delItem('${S.notes}','${n.id}',()=>renderCaseNotes('${id}'))">Delete</button></div></div><div class="sub">${new Date(n.createdAt).toLocaleString()}</div><div class="body">${esc(n.text)}</div></div>`).join('')||'<div class="empty"><strong>No notes.</strong></div>'}
function editNote(id){let rows=load(S.notes),n=rows.find(x=>x.id===id),v=prompt('Edit note:',n.text);if(v!==null){n.text=v;save(S.notes,rows);renderCaseNotes(n.caseId)}}
function renderTasks(id){let rows=load(S.tasks).filter(x=>x.caseId===id);caseTasksList.innerHTML=rows.map(t=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(t.text)}</strong><div><button class="btn btn-small btn-secondary" onclick="toggleTask('${t.id}')">${t.done?'Reopen':'Complete'}</button> <button class="btn btn-small btn-danger" onclick="delItem('${S.tasks}','${t.id}',()=>renderTasks('${id}'))">Delete</button></div></div><div class="sub">${fmt(t.dueDate)} • ${esc(t.priority||'No priority')} • ${t.done?'Completed':'Open'}</div></div>`).join('')||'<div class="empty"><strong>No tasks.</strong></div>'}
function toggleTask(id){let rows=load(S.tasks),t=rows.find(x=>x.id===id);t.done=!t.done;save(S.tasks,rows);if(document.body.dataset.page==='case-detail')renderTasks(t.caseId);else tasksInit()}
function renderPayments(id){let rows=load(S.payments).filter(x=>x.caseId===id).slice().reverse();casePaymentsList.innerHTML=rows.map(p=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${money(p.amount)}</strong><button class="btn btn-small btn-danger" onclick="delItem('${S.payments}','${p.id}',()=>renderPayments('${id}'))">Delete</button></div><div class="sub">${fmt(p.date)} • ${esc(p.method||'')} ${p.reference?'• Ref '+esc(p.reference):''}</div><div class="body">${esc(p.note||'')}</div></div>`).join('')||'<div class="empty"><strong>No payments.</strong></div>';let sel=paymentForm.elements.invoiceId,inv=load(S.invoices).filter(x=>x.caseId===id&&x.status!=='Paid');sel.innerHTML='<option value="">Not applied to invoice</option>'+inv.map(i=>`<option value="${i.id}">${esc(i.number)} — ${money(i.amount)}</option>`).join('')}
function renderInvoices(id){let rows=load(S.invoices).filter(x=>x.caseId===id).slice().reverse();caseInvoicesList.innerHTML=rows.map(i=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(i.number)} — ${money(i.amount)}</strong><div><button class="btn btn-small btn-secondary" onclick="printInvoice('${i.id}')">Print</button> <button class="btn btn-small btn-secondary" onclick="emailInvoice('${i.id}')">Email</button> <button class="btn btn-small btn-danger" onclick="delItem('${S.invoices}','${i.id}',()=>renderInvoices('${id}'))">Delete</button></div></div><div class="sub">${fmt(i.date)} • Due ${fmt(i.dueDate)} • <span class="invoice-status ${String(i.status).toLowerCase().replace(/ /g,'-')}">${esc(i.status)}</span></div><div class="body">${esc(i.description||'')}</div></div>`).join('')||'<div class="empty"><strong>No invoices.</strong></div>'}
function delItem(store,id,cb){if(!confirm('Delete this item?'))return;save(store,load(store).filter(x=>x.id!==id));cb&&cb()}

async function openDB(){return new Promise((res,rej)=>{let r=indexedDB.open('rlaw_handles_v4',1);r.onupgradeneeded=()=>r.result.createObjectStore('handles');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function saveHandle(id,h){let db=await openDB();return new Promise((res,rej)=>{let tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(h,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getHandle(id){let db=await openDB();return new Promise((res,rej)=>{let r=db.transaction('handles').objectStore('handles').get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function attachDoc(cs,c){let f=new FormData(docForm),title=String(f.get('title')||'').trim();if(!title){alert('Enter a Document Title first.');return}if('showOpenFilePicker'in window){try{let[h]=await window.showOpenFilePicker({multiple:false}),id=uid('doc');await saveHandle(id,h);let rows=load(S.docs);rows.push({id,caseId:cs.id,clientId:cs.clientId,clientName:cname(c),title,type:String(f.get('type')||''),note:String(f.get('note')||''),fileName:h.name,createdAt:now(),handle:true});save(S.docs,rows);docForm.reset();renderDocs(cs.id);toast('Document linked');return}catch(e){if(e.name==='AbortError')return;console.warn(e)}}chooseLocalFileFallback(cs,c,title,String(f.get('type')||''),String(f.get('note')||''))}
function chooseLocalFileFallback(cs,c,title,type,note){let input=document.createElement('input');input.type='file';input.style.display='none';document.body.appendChild(input);input.onchange=()=>{let file=input.files&&input.files[0];if(!file){input.remove();return}let rows=load(S.docs),id=uid('doc');rows.push({id,caseId:cs.id,clientId:cs.clientId,clientName:cname(c),title,type,note,fileName:file.name,createdAt:now(),handle:false});save(S.docs,rows);docForm.reset();renderDocs(cs.id);input.remove();alert('The document was added to the list. This browser did not allow a persistent local-file handle, so use Edge/Chrome or the installed EXE later for one-click reopening.')} ;input.click()}
async function openDoc(id){let d=load(S.docs).find(x=>x.id===id),h=await getHandle(id);if(!h){alert('This file does not have a persistent browser file handle. Re-link it from the case page in Edge/Chrome. The file itself has not been deleted.');return}let p=await h.queryPermission({mode:'read'});if(p!=='granted')p=await h.requestPermission({mode:'read'});if(p!=='granted')return;let f=await h.getFile(),u=URL.createObjectURL(f);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000)}
function renderDocs(id){let rows=load(S.docs).filter(x=>x.caseId===id).slice().reverse();caseDocumentsList.innerHTML=rows.map(d=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(d.title)}</strong><div><button class="btn btn-small btn-secondary" onclick="openDoc('${d.id}')">Open</button> <button class="btn btn-small btn-danger" onclick="delItem('${S.docs}','${d.id}',()=>renderDocs('${id}'))">Delete</button></div></div><div class="sub">${esc(d.type||'Document')} • ${esc(d.fileName)}</div><div class="body">${esc(d.note||'')}</div></div>`).join('')||'<div class="empty"><strong>No documents.</strong></div>'}

function printInvoice(id){let i=load(S.invoices).find(x=>x.id===id),cs=getCase(i.caseId),c=getClient(i.clientId),w=window.open('','_blank');w.document.write(`<html><body style="font-family:Arial;padding:40px"><h1>Rodriguez Law Firm, LLC</h1><h2>Invoice ${esc(i.number)}</h2><p><b>Client:</b> ${esc(cname(c))}<br><b>Case:</b> ${esc(cs.caseType)} ${esc(cs.subCaseType||'')}<br><b>Date:</b> ${fmt(i.date)}<br><b>Due:</b> ${fmt(i.dueDate)}</p><hr><p>${esc(i.description||'Legal Services')}</p><h2>${money(i.amount)}</h2><p>${esc(i.note||'')}</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
function emailInvoice(id){let i=load(S.invoices).find(x=>x.id===id),c=getClient(i.clientId);location.href=`mailto:${encodeURIComponent(c.email||'')}?subject=${encodeURIComponent('Invoice '+i.number+' — Rodriguez Law Firm')}&body=${encodeURIComponent('Invoice '+i.number+' amount '+money(i.amount)+' due '+fmt(i.dueDate)+'.')}`}
function printCaseReport(){
  const id=qs('id');
  if(!id)return;
  location.href=`case-report-preview.html?id=${encodeURIComponent(id)}&print=1`;
}
let caseFilter='Active';function casesInit(){document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{caseFilter=t.dataset.status;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===t));renderCases()});caseSearch.oninput=renderCases;renderCases()}
function renderCases(){let q=caseSearch.value.toLowerCase(),cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),rows=load(S.cases).filter(cs=>(caseFilter==='All'||cs.caseStatus===caseFilter)&&(!q||[cname(cm[cs.clientId]),cs.caseType,cs.subCaseType,cs.caseNumber,cs.caseNotes].join(' ').toLowerCase().includes(q)));casesBody.innerHTML=rows.map(cs=>`<tr><td><a class="link" href="case-detail.html?id=${cs.id}">${esc(cname(cm[cs.clientId]))}</a></td><td>${esc(cs.caseType)}</td><td>${esc(cs.subCaseType||'—')}</td><td>${esc(cs.caseNumber||'—')}</td><td><span class="${statusClass(cs.caseStatus)}">${esc(cs.caseStatus)}</span></td><td>${money(cs.serviceQuote)}</td></tr>`).join('')}
function notesInit(){let cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),rows=[...load(S.notes).map(x=>({...x,kind:'Case Note'})),...load(S.contact).map(x=>({...x,kind:'Contact Update'}))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));allNotes.innerHTML=rows.map(n=>`<div class="timeline-item"><strong>${esc(n.kind)} — ${esc(cname(cm[n.clientId]))}</strong><div class="sub">${new Date(n.createdAt).toLocaleString()}</div><div class="body">${esc(n.text)}</div></div>`).join('')||'<div class="empty"><strong>No notes.</strong></div>'}
function tasksInit(){let rows=load(S.tasks).sort((a,b)=>(a.done-b.done)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));allTasks.innerHTML=rows.map(t=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(t.text)}</strong><div><a class="btn btn-small btn-secondary" href="case-detail.html?id=${t.caseId}">View / Open</a> <button class="btn btn-small btn-secondary" onclick="toggleTask('${t.id}')">${t.done?'Reopen':'Complete'}</button></div></div><div class="sub">${esc(t.clientName)} • ${fmt(t.dueDate)} • ${esc(t.priority||'No priority')} • ${t.done?'Completed':'Open'}</div></div>`).join('')||'<div class="empty"><strong>No tasks.</strong></div>'}
function docsInit(){documentsBody.innerHTML=load(S.docs).slice().reverse().map(d=>`<tr><td><button class="btn btn-small btn-secondary" onclick="openDoc('${d.id}')">Open</button></td><td>${esc(d.clientName)}</td><td><a class="link" href="case-detail.html?id=${d.caseId}">${esc(d.title)}</a></td><td>${esc(d.type||'—')}</td><td>${esc(d.fileName)}</td><td>${new Date(d.createdAt).toLocaleDateString()}</td></tr>`).join('')}
function invoicesInit(){let cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c]));invoicesBody.innerHTML=load(S.invoices).slice().reverse().map(i=>`<tr><td><a class="link" href="case-detail.html?id=${i.caseId}">${esc(i.number)}</a></td><td>${esc(cname(cm[i.clientId]))}</td><td>${esc(cases[i.caseId]?.caseType||'')}</td><td>${fmt(i.date)}</td><td>${money(i.amount)}</td><td><span class="invoice-status ${String(i.status).toLowerCase().replace(/ /g,'-')}">${esc(i.status)}</span></td><td><button class="btn btn-small btn-secondary" onclick="printInvoice('${i.id}')">Print</button></td></tr>`).join('')}
function contactsInit(){contactsBody.innerHTML=load(S.clients).map(c=>`<tr><td><a class="link" href="client-profile.html?id=${c.id}">${esc(cname(c))}</a></td><td>${c.phone?`<a class="link" href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`:'—'}</td><td>${c.email?`<a class="link" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'—'}</td><td>${esc([c.address,c.city,c.state,c.zip].filter(Boolean).join(', ')||'—')}</td></tr>`).join('')}
function paymentsInit(){let years=[...new Set(load(S.payments).map(p=>(p.date||'').slice(0,4)).filter(Boolean))],cur=String(new Date().getFullYear());if(!years.includes(cur))years.push(cur);years.sort().reverse();paymentYear.innerHTML=years.map(y=>`<option>${y}</option>`).join('');paymentYear.value=cur;paymentYear.onchange=renderPaymentYear;renderPaymentYear()}
function renderPaymentYear(){let y=paymentYear.value,ps=load(S.payments),months=Array.from({length:12},(_,m)=>ps.filter(p=>(p.date||'').startsWith(y+'-'+String(m+1).padStart(2,'0'))));monthlyPaymentsBody.innerHTML=months.map((entries,m)=>{let total=entries.reduce((s,p)=>s+(+p.amount||0),0),id=`month_${m}`;return `<tr><td>${new Date(2000,m,1).toLocaleDateString('en-US',{month:'long'})}</td><td>${money(total)}</td><td>${total?`<button class="btn btn-small btn-secondary" onclick="toggleMonthDetails('${id}',${m})">View All</button>`:'—'}</td></tr><tr id="${id}" style="display:none"><td colspan="3" class="payment-month-details"></td></tr>`}).join('');annualPaidTotal.textContent=money(months.flat().reduce((s,p)=>s+(+p.amount||0),0));let t=ps.reduce((s,p)=>s+(+p.amount||0),0),q=load(S.cases).reduce((s,c)=>s+(+String(c.serviceQuote||0).replace(/[$,]/g,'')||0),0);allTimePaid.textContent=money(t);allTimeBalance.textContent=money(Math.max(0,q-t))}
function toggleMonthDetails(id,m){let row=document.getElementById(id);if(row.style.display!=='none'){row.style.display='none';return}let y=paymentYear.value,mm=String(m+1).padStart(2,'0'),cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c])),entries=load(S.payments).filter(p=>(p.date||'').startsWith(`${y}-${mm}`)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));row.querySelector('td').innerHTML=`<table><thead><tr><th>Client</th><th>Case #</th><th>Date</th><th>Amount</th><th>Method</th></tr></thead><tbody>${entries.map(p=>`<tr class="payment-detail-row"><td><a class="link" href="case-detail.html?id=${p.caseId}">${esc(cname(cm[p.clientId]))}</a></td><td><a class="link" href="case-detail.html?id=${p.caseId}">${esc(cases[p.caseId]?.caseNumber||'—')}</a></td><td>${fmt(p.date)}</td><td>${money(p.amount)}</td><td>${esc(p.method||'—')}</td></tr>`).join('')}</tbody></table>`;row.style.display='table-row'}
let cy,cmth,calendarFilter='All';function calendarInit(){let n=new Date();cy=n.getFullYear();cmth=n.getMonth();document.querySelectorAll('#calendarFilters .tab').forEach(t=>t.onclick=()=>{calendarFilter=t.dataset.filter;document.querySelectorAll('#calendarFilters .tab').forEach(x=>x.classList.toggle('active',x===t));renderCal()});renderCal()}function changeMonth(d){cmth+=d;if(cmth<0){cmth=11;cy--}if(cmth>11){cmth=0;cy++}renderCal()}function goToday(){let n=new Date();cy=n.getFullYear();cmth=n.getMonth();renderCal()}
function renderCal(){let rows=getCalendarItems().filter(x=>calendarFilter==='All'||x.kind===calendarFilter),s=new Date(cy,cmth,1),e=new Date(cy,cmth+1,0);calendarTitle.textContent=s.toLocaleDateString('en-US',{month:'long',year:'numeric'});let out='<div class="calendar-grid cal-head">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div>${x}</div>`).join('')+'</div><div class="calendar-grid">';for(let i=0;i<s.getDay();i++)out+='<div class="cal-cell muted"></div>';for(let d=1;d<=e.getDate();d++){let iso=`${cy}-${String(cmth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,r=rows.filter(x=>x.date===iso);out+=`<button class="cal-cell" data-date="${iso}"><b>${d}</b>${r.length?`<span class="cal-count">${r.length}</span>`:''}${r.slice(0,3).map(x=>`<span class="cal-event ${x.kind.toLowerCase()}">${esc(x.kind)}</span>`).join('')}</button>`}out+='</div>';calendarWrap.innerHTML=out;calendarDetails.innerHTML='<div class="empty"><strong>Choose a date.</strong><div class="sub">Details will appear here without overlapping.</div></div>';calendarWrap.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{let r=rows.filter(x=>x.date===b.dataset.date);calendarDetails.innerHTML=r.length?r.map(x=>`<a class="calendar-detail-item ${x.kind.toLowerCase()}" href="case-detail.html?id=${x.caseId}"><div class="calendar-detail-title">${esc(x.kind)} — ${esc(x.client)}</div><div class="calendar-detail-meta">📅 ${fmt(x.date)}${x.time?` &nbsp; 🕒 ${esc(fmtTime(x.time))}`:''} • Click to view case</div><div class="calendar-detail-text">${esc(x.title)}</div></a>`).join(''):'<div class="empty"><strong>No '+esc(calendarFilter==='All'?'scheduled items':calendarFilter.toLowerCase()+' items')+' on this date.</strong></div>'})}
function overviewInit(){let cs=load(S.clients),cases=load(S.cases),ps=load(S.payments),q=cases.reduce((s,c)=>s+(+String(c.serviceQuote||0).replace(/[$,]/g,'')||0),0),p=ps.reduce((s,x)=>s+(+x.amount||0),0);ovClients.textContent=cs.length;ovActive.textContent=cases.filter(c=>c.caseStatus==='Active').length;ovDates.textContent=getDates().length;ovBalance.textContent=money(Math.max(0,q-p));ovOpenTasks.textContent=load(S.tasks).filter(t=>!t.done).length;let g={};cases.filter(c=>c.caseStatus==='Active').forEach(c=>g[c.caseType]=(g[c.caseType]||0)+1);caseTypeOverview.innerHTML=Object.entries(g).map(([k,v])=>`<div class="timeline-item"><strong>${esc(k)}</strong><div class="sub">${v} active case${v===1?'':'s'}</div></div>`).join('')||'<div class="empty"><strong>No active cases.</strong></div>'}
function settingsInit(){let f=settingsForm,s=loadObj(S.settings);['firmName','address','cityStateZip','phone'].forEach(k=>f.elements[k].value=s[k]||'');f.onsubmit=e=>{e.preventDefault();let o={};for(let[k,v]of new FormData(f).entries())o[k]=String(v);save(S.settings,o);toast('Settings saved')}}
function exportData(){let d={version:4,exportedAt:now()};Object.keys(S).forEach(k=>d[k]=k==='settings'?loadObj(S[k]):load(S[k]));let a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.href=u;a.download='RodriguezLawFirmBackup.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function importData(i){let f=i.files[0],r=new FileReader();r.onload=()=>{try{let d=JSON.parse(r.result);Object.keys(S).forEach(k=>save(S[k],d[k]||(k==='settings'?{}:[])));location.reload()}catch(e){alert('Invalid backup')}};r.readAsText(f)}

document.addEventListener('DOMContentLoaded',async()=>{if(window.desktopHydrate)await window.desktopHydrate();navActive();let p=document.body.dataset.page;if(p==='dashboard')dashboardInit();if(p==='add-client')addClientInit();if(p==='clients')clientsInit();if(p==='client-profile')clientProfileInit();if(p==='add-case')addCaseInit();if(p==='case-detail')caseDetailInit();if(p==='cases')casesInit();if(p==='notes')notesInit();if(p==='tasks')tasksInit();if(p==='documents')docsInit();if(p==='invoices')invoicesInit();if(p==='contacts')contactsInit();if(p==='payments')paymentsInit();if(p==='calendar')calendarInit();if(p==='overview')overviewInit();if(p==='settings')settingsInit();if(p==='past-due')pastDueInit()});


/* ===== v7 pagination + invoice presentation overrides ===== */
var listPages={clients:1,cases:1,notes:1,documents:1,tasks:1,invoices:1,contacts:1};
const STANDARD_PAGE_SIZE=25;
const TASK_PAGE_SIZE=18;

function paginateRows(rows,page,size){
  const totalPages=Math.max(1,Math.ceil(rows.length/size));
  page=Math.min(Math.max(1,page),totalPages);
  const start=(page-1)*size;
  return {page,totalPages,total:rows.length,rows:rows.slice(start,start+size),start};
}
function pagerHTML(key,page,totalPages,total){
  return `<div class="pager-info">${total?`Showing page ${page} of ${totalPages} • ${total} total`:'No entries'}</div>
  <div class="pager-actions">
    <button class="btn btn-small btn-secondary" ${page<=1?'disabled':''} onclick="changeListPage('${key}',-1)">← BACK</button>
    <button class="btn btn-small btn-secondary" ${page>=totalPages?'disabled':''} onclick="changeListPage('${key}',1)">NEXT →</button>
  </div>`;
}
function setPagers(key,page,totalPages,total){
  const top=document.getElementById(key+'PagerTop'),bot=document.getElementById(key+'PagerBottom');
  const h=pagerHTML(key,page,totalPages,total);
  if(top)top.innerHTML=h;if(bot)bot.innerHTML=h;
}
function changeListPage(key,delta){
  listPages[key]=Math.max(1,(listPages[key]||1)+delta);
  if(key==='clients')drawClients();
  if(key==='cases')renderCasesTable();
  if(key==='notes')notesInit();
  if(key==='documents')docsInit();
  if(key==='tasks')tasksInit();
  if(key==='invoices')invoicesInit();
  if(key==='contacts')contactsInit();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* Clients: 25 per page; filters reset to page 1. */
function clientsInit(){
  let input=clientSearch;input.value=qs('q')||'';
  document.querySelectorAll('#alphaTabs .tab').forEach(t=>t.onclick=()=>{
    clientLetter=t.dataset.letter;listPages.clients=1;
    document.querySelectorAll('#alphaTabs .tab').forEach(x=>x.classList.toggle('active',x===t));drawClients()
  });
  input.addEventListener('input',()=>{listPages.clients=1;drawClients()});drawClients()
}
function drawClients(){
  let input=document.getElementById('clientSearch'),q=(input?.value||'').toLowerCase(),cases=load(S.cases);
  let rows=load(S.clients).filter(c=>{
    let last=(c.lastName||'').trim().toUpperCase(),letterOK=clientLetter==='ALL'||last.startsWith(clientLetter),
    searchOK=!q||[c.firstName,c.lastName,c.phone,c.email].join(' ').toLowerCase().includes(q)||cases.some(cs=>cs.clientId===c.id&&[cs.caseType,cs.subCaseType,cs.caseNumber,cs.caseNotes].join(' ').toLowerCase().includes(q));
    return letterOK&&searchOK
  }).sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||'')||(a.firstName||'').localeCompare(b.firstName||''));
  let pg=paginateRows(rows,listPages.clients,STANDARD_PAGE_SIZE);listPages.clients=pg.page;setPagers('clients',pg.page,pg.totalPages,pg.total);
  clientsBody.innerHTML=pg.rows.map(c=>`<tr><td><a class="link" href="client-profile.html?id=${c.id}">${esc(cname(c))}</a></td><td>${esc(c.phone||'—')}</td><td>${esc(c.email||'—')}</td><td>${cases.filter(x=>x.clientId===c.id).length}</td><td>${esc([c.city,c.state].filter(Boolean).join(', ')||'—')}</td><td><a class="btn btn-small btn-secondary" href="client-profile.html?id=${c.id}">VIEW</a></td></tr>`).join('')||`<tr><td colspan="6" class="empty"><strong>No clients ${clientLetter==='ALL'?'found.':'with last names beginning with '+clientLetter+'.'}</strong></td></tr>`
}

/* Cases: 25 per page; status/search reset page. */
function casesInit(){
  document.querySelectorAll('[data-status]').forEach(t=>t.onclick=()=>{
    caseFilter=t.dataset.status;listPages.cases=1;
    document.querySelectorAll('[data-status]').forEach(x=>x.classList.toggle('active',x===t));renderCasesTable()
  });
  caseSearch.oninput=()=>{listPages.cases=1;renderCasesTable()};renderCasesTable()
}
function renderCasesTable(){
  let q=(caseSearch.value||'').toLowerCase(),cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c]));
  let rows=load(S.cases).filter(cs=>(caseFilter==='All'||cs.caseStatus===caseFilter)&&(!q||[cname(cm[cs.clientId]),cs.caseType,cs.subCaseType,cs.caseNumber,cs.caseNotes].join(' ').toLowerCase().includes(q)));
  let pg=paginateRows(rows,listPages.cases,STANDARD_PAGE_SIZE);listPages.cases=pg.page;setPagers('cases',pg.page,pg.totalPages,pg.total);
  casesBody.innerHTML=pg.rows.map(cs=>`<tr><td><a class="link" href="case-detail.html?id=${cs.id}">${esc(cname(cm[cs.clientId]))}</a></td><td>${esc(cs.caseType)}</td><td>${esc(cs.subCaseType||'—')}</td><td>${esc(cs.caseNumber||'—')}</td><td><span class="${statusClass(cs.caseStatus)}">${esc(cs.caseStatus)}</span></td><td>${money(cs.serviceQuote)}</td><td><a class="btn btn-small btn-secondary" href="case-detail.html?id=${cs.id}">VIEW</a></td></tr>`).join('')||'<tr><td colspan="7" class="empty"><strong>No cases in this view.</strong></td></tr>'
}

/* Notes: 25 per page + VIEW button for each item. */
function notesInit(){
  let cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c]));
  let rows=[...load(S.notes).map(x=>({...x,kind:'Case Note'})),...load(S.contact).map(x=>({...x,kind:'Contact Update'}))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  let pg=paginateRows(rows,listPages.notes,STANDARD_PAGE_SIZE);listPages.notes=pg.page;setPagers('notes',pg.page,pg.totalPages,pg.total);
  allNotes.innerHTML=pg.rows.map(n=>{
    const href=n.caseId?`case-detail.html?id=${n.caseId}`:`client-profile.html?id=${n.clientId}`;
    return `<div class="timeline-item"><div class="note-head-row"><div><strong>${esc(n.kind)} — ${esc(cname(cm[n.clientId]))}</strong><div class="sub">${new Date(n.createdAt).toLocaleString()}</div></div><div class="actions"><a class="btn btn-small btn-secondary" href="${href}">VIEW / OPEN</a></div></div><div class="body">${esc(n.text)}</div></div>`
  }).join('')||'<div class="empty"><strong>No notes.</strong></div>'
}

/* Documents: 25 per page. */
function docsInit(){
  let rows=load(S.docs).slice().reverse(),pg=paginateRows(rows,listPages.documents,STANDARD_PAGE_SIZE);listPages.documents=pg.page;setPagers('documents',pg.page,pg.totalPages,pg.total);
  documentsBody.innerHTML=pg.rows.map(d=>`<tr><td><button class="btn btn-small btn-secondary" onclick="openDoc('${d.id}')">Open</button></td><td>${esc(d.clientName)}</td><td><a class="link" href="case-detail.html?id=${d.caseId}">${esc(d.title)}</a></td><td>${esc(d.type||'—')}</td><td>${esc(d.fileName)}</td><td>${new Date(d.createdAt).toLocaleDateString()}</td></tr>`).join('')||'<tr><td colspan="6" class="empty"><strong>No documents.</strong></td></tr>'
}

/* Tasks: 18 per page, split 9 down each of two columns. */
function taskEntryHTML(t){
  return `<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(t.text)}</strong><div><a class="btn btn-small btn-secondary" href="case-detail.html?id=${t.caseId}">View / Open</a> <button class="btn btn-small btn-secondary" onclick="toggleTask('${t.id}')">${t.done?'Reopen':'Complete'}</button></div></div><div class="sub">${esc(t.clientName)} • ${fmt(t.dueDate)} • ${esc(t.priority||'No priority')} • ${t.done?'Completed':'Open'}</div></div>`;
}
function tasksInit(){
  let rows=load(S.tasks).sort((a,b)=>(a.done-b.done)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  let pg=paginateRows(rows,listPages.tasks,TASK_PAGE_SIZE);listPages.tasks=pg.page;setPagers('tasks',pg.page,pg.totalPages,pg.total);
  const left=pg.rows.slice(0,9),right=pg.rows.slice(9,18);
  taskColumn1.innerHTML=left.map(taskEntryHTML).join('')||'<div class="empty"><strong>No tasks.</strong></div>';
  taskColumn2.innerHTML=right.map(taskEntryHTML).join('');
}

/* Invoices: 25 per page. */
function invoicesInit(){
  let cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c])),rows=load(S.invoices).slice().reverse();
  let pg=paginateRows(rows,listPages.invoices,STANDARD_PAGE_SIZE);listPages.invoices=pg.page;setPagers('invoices',pg.page,pg.totalPages,pg.total);
  invoicesBody.innerHTML=pg.rows.map(i=>`<tr><td><a class="link" href="case-detail.html?id=${i.caseId}">${esc(i.number)}</a></td><td>${esc(cname(cm[i.clientId]))}</td><td>${esc(cases[i.caseId]?.caseType||'')}</td><td>${fmt(i.date)}</td><td>${money(i.amount)}</td><td><span class="invoice-status ${String(i.status).toLowerCase().replace(/ /g,'-')}">${esc(i.status)}</span></td><td><button class="btn btn-small btn-secondary" onclick="printInvoice('${i.id}')">Print</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty"><strong>No invoices.</strong></td></tr>'
}

/* Contacts: 25 per page. */
function contactsInit(){
  let rows=load(S.clients).slice().sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||''));
  let pg=paginateRows(rows,listPages.contacts,STANDARD_PAGE_SIZE);listPages.contacts=pg.page;setPagers('contacts',pg.page,pg.totalPages,pg.total);
  contactsBody.innerHTML=pg.rows.map(c=>`<tr><td><a class="link" href="client-profile.html?id=${c.id}">${esc(cname(c))}</a></td><td>${c.phone?`<a class="link" href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`:'—'}</td><td>${c.email?`<a class="link" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'—'}</td><td>${esc([c.address,c.city,c.state,c.zip].filter(Boolean).join(', ')||'—')}</td></tr>`).join('')||'<tr><td colspan="4" class="empty"><strong>No contacts.</strong></td></tr>'
}

/* Professional invoice printout. */
function firmInvoiceInfo(){
  const s=loadObj(S.settings);
  return {
    name:s.firmName||'Rodriguez Law Firm, LLC',
    address:s.address||'349 West Main Street',
    city:s.cityStateZip||'Meriden, CT 06451',
    phone:s.phone||'(203) 630-0406'
  };
}
function printInvoice(id){
  const i=load(S.invoices).find(x=>x.id===id); if(!i)return;
  const cs=getCase(i.caseId)||{}, c=getClient(i.clientId)||{}, f=firmInvoiceInfo();
  const caseLabel=[cs.caseType,cs.subCaseType].filter(Boolean).join(' — ')||'Legal Matter';
  const w=window.open('','_blank');
  w.document.write(`<html><head><meta charset="utf-8"><title>Invoice ${esc(i.number)}</title>
  <style>
    *{box-sizing:border-box} body{margin:0;padding:34px;background:#eef1f4;font-family:Arial,Helvetica,sans-serif;color:#17293e}
    .sheet{max-width:850px;margin:0 auto;background:#fff;border:1px solid #d6dbe0;box-shadow:0 6px 24px rgba(15,33,50,.10)}
    .head{background:linear-gradient(135deg,#071c31,#0d355a);color:white;padding:30px 34px;display:flex;justify-content:space-between;gap:30px;border-bottom:5px solid #d2a44b}
    .brand{font-family:Georgia,serif;font-size:27px;font-weight:bold}.contact{text-align:right;color:#f2dfae;font-size:12px;line-height:1.6}
    .body{padding:30px 34px}.title{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}
    h1{margin:0;font:700 36px Georgia,serif;color:#0b2948}.number{text-align:right;color:#667382;font-size:13px;line-height:1.6}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:20px 0 26px}.box{border:1px solid #dfe3e7;border-radius:7px;overflow:hidden}
    .box h3{margin:0;padding:9px 12px;background:#f4ead3;color:#6b4b13;font-size:11px;text-transform:uppercase;letter-spacing:.7px}
    .box div{padding:12px;font-size:13px;line-height:1.55}
    table{width:100%;border-collapse:collapse;margin-top:18px}th{background:#0b2948;color:#fff;padding:11px 12px;text-align:left;font-size:12px}
    td{padding:15px 12px;border-bottom:1px solid #e0e3e6}.amount{text-align:right;font-weight:bold}
    .total{margin:22px 0 0 auto;width:320px;border-top:3px solid #d2a44b;padding-top:12px;display:flex;justify-content:space-between;font:700 22px Georgia,serif}
    .note{margin-top:28px;background:#f8f6f1;border-left:4px solid #d2a44b;padding:14px 16px;font-size:13px;line-height:1.55}
    .status{display:inline-block;padding:5px 10px;border-radius:999px;background:#f4ead3;color:#725115;font-weight:bold;font-size:11px}
    .footer{margin-top:34px;background:#081f35;color:#e9d39e;text-align:center;padding:15px 20px;font-size:11px;line-height:1.55}
    @media print{body{padding:0;background:#fff}.sheet{border:0;box-shadow:none}}
  </style></head><body><div class="sheet">
  <div class="head"><div><div class="brand">${esc(f.name)}</div><div style="margin-top:7px;color:#e9d39e;font-size:12px">Professional Legal Services</div></div>
  <div class="contact">${esc(f.address)}<br>${esc(f.city)}<br>${esc(f.phone)}</div></div>
  <div class="body"><div class="title"><div><h1>INVOICE</h1><div style="margin-top:7px"><span class="status">${esc(i.status||'Draft')}</span></div></div>
  <div class="number"><b>Invoice #${esc(i.number)}</b><br>Date: ${esc(fmt(i.date))}<br>Due: ${esc(fmt(i.dueDate))}</div></div>
  <div class="grid"><div class="box"><h3>Bill To</h3><div><b>${esc(cname(c))}</b><br>${c.address?esc(c.address)+'<br>':''}${esc([c.city,c.state,c.zip].filter(Boolean).join(', '))}${c.email?'<br>'+esc(c.email):''}${c.phone?'<br>'+esc(c.phone):''}</div></div>
  <div class="box"><h3>Matter Information</h3><div><b>${esc(caseLabel)}</b><br>Case #: ${esc(cs.caseNumber||'—')}<br>Court: ${esc(cs.court||'—')}</div></div></div>
  <table><thead><tr><th>Description of Legal Services</th><th style="text-align:right">Amount</th></tr></thead><tbody><tr><td>${esc(i.description||'Legal services rendered')}</td><td class="amount">${money(i.amount)}</td></tr></tbody></table>
  <div class="total"><span>Amount Due</span><span>${money(i.amount)}</span></div>
  ${i.note?`<div class="note"><b>Invoice Note</b><br>${esc(i.note)}</div>`:''}
  </div><div class="footer">${esc(f.name)} &nbsp; • &nbsp; ${esc(f.address)}, ${esc(f.city)} &nbsp; • &nbsp; ${esc(f.phone)}<br>Thank you for choosing our firm.</div>
  </div><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}
function emailInvoice(id){
  const i=load(S.invoices).find(x=>x.id===id);if(!i)return;
  const cs=getCase(i.caseId)||{},c=getClient(i.clientId)||{},f=firmInvoiceInfo();
  const subject=encodeURIComponent(`Invoice ${i.number} — ${f.name}`);
  const body=encodeURIComponent(
`Dear ${c.firstName||cname(c)},

Please find the details for Invoice ${i.number} from ${f.name}.

Invoice #: ${i.number}
Matter: ${[cs.caseType,cs.subCaseType].filter(Boolean).join(' — ')||'Legal Matter'}
Case #: ${cs.caseNumber||'—'}
Invoice Date: ${fmt(i.date)}
Due Date: ${fmt(i.dueDate)}
Amount Due: ${money(i.amount)}
Status: ${i.status||'Draft'}

Services:
${i.description||'Legal services rendered'}

${i.note?`Note: ${i.note}\n\n`:''}If you have any questions regarding this invoice, please contact our office.

${f.name}
${f.address}
${f.city}
${f.phone}`
  );
  location.href=`mailto:${encodeURIComponent(c.email||'')}?subject=${subject}&body=${body}`;
}


/* ===== Desktop native file linking ===== */
async function attachDoc(cs,c){
  let f=new FormData(docForm),title=String(f.get('title')||'').trim();
  if(!title){alert('Enter a Document Title first.');return}
  if(window.desktopChooseFile){
    let picked=await window.desktopChooseFile();
    if(!picked || !picked.path)return;
    let rows=load(S.docs);
    rows.push({
      id:uid('doc'),caseId:cs.id,clientId:cs.clientId,clientName:cname(c),
      title,type:String(f.get('type')||''),note:String(f.get('note')||''),
      fileName:picked.name,filePath:picked.path,createdAt:now(),desktopPath:true
    });
    save(S.docs,rows);docForm.reset();renderDocs(cs.id);toast('Document linked');return;
  }
  alert('Desktop file picker is not available.');
}
async function openDoc(id){
  let d=load(S.docs).find(x=>x.id===id);
  if(!d)return;
  if(d.filePath && window.desktopOpenFile){
    let result=await window.desktopOpenFile(d.filePath);
    if(result && result.ok===false)alert(result.error||'Could not open file.');
    return;
  }
  alert('This document does not have a saved Windows file path. Re-link it from the case page.');
}


/* ===== Desktop v8 fixes ===== */

/* Dashboard payments: show EVERY payment-bearing case, even if there is no service quote. */
function renderDashPayments(){
  let ps=load(S.payments),cases=load(S.cases),cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),
      quote=0,paid=0;
  let caseMap=Object.fromEntries(cases.map(c=>[c.id,c]));
  cases.forEach(cs=>quote+=(+String(cs.serviceQuote||0).replace(/[$,]/g,'')||0));
  ps.forEach(p=>paid+=(+p.amount||0));

  let relevantIds=new Set([
    ...cases.filter(cs=>cs.serviceQuote).map(cs=>cs.id),
    ...ps.map(p=>p.caseId).filter(Boolean)
  ]);

  let rows=[...relevantIds].map(caseId=>{
    let cs=caseMap[caseId];
    if(!cs)return null;
    let q=+String(cs.serviceQuote||0).replace(/[$,]/g,'')||0;
    let p=ps.filter(x=>x.caseId===caseId).reduce((s,x)=>s+(+x.amount||0),0);
    return {cs,q,p,b:Math.max(0,q-p)};
  }).filter(Boolean)
    .sort((a,b)=>{
      const al=ps.filter(x=>x.caseId===a.cs.id).map(x=>x.date||'').sort().pop()||'';
      const bl=ps.filter(x=>x.caseId===b.cs.id).map(x=>x.date||'').sort().pop()||'';
      return bl.localeCompare(al);
    });

  paymentsBody.innerHTML=rows.slice(0,5).map(r=>`<tr>
    <td><a class="link" href="case-detail.html?id=${r.cs.id}">${esc(cname(cm[r.cs.clientId]))}</a></td>
    <td>${money(r.q)}</td><td>${money(r.p)}</td><td>${money(r.b)}</td>
  </tr>`).join('') || '<tr><td colspan="4" style="height:46px;color:#718092">No payment activity.</td></tr>';

  totalQuote.textContent=money(quote);
  totalPaid.textContent=money(paid);
  totalBalance.textContent=money(Math.max(0,quote-paid));
}

/* Professional invoice HTML shared by View, Save, and Print. */
function buildInvoiceHTML(id, includeToolbar=false){
  const i=load(S.invoices).find(x=>x.id===id); if(!i)return '';
  const cs=getCase(i.caseId)||{}, c=getClient(i.clientId)||{}, f=firmInvoiceInfo();
  const caseLabel=[cs.caseType,cs.subCaseType].filter(Boolean).join(' — ')||'Legal Matter';
  const clientAddr=[c.city,c.state,c.zip].filter(Boolean).join(', ');
  return `<div class="ip-head">
    <div><div class="ip-brand">${esc(f.name)}</div><div style="margin-top:7px;color:#e9d39e;font-size:12px">Professional Legal Services</div></div>
    <div class="ip-contact">${esc(f.address)}<br>${esc(f.city)}<br>${esc(f.phone)}</div>
  </div>
  <div class="ip-body">
    <div class="ip-title">
      <div><h1>INVOICE</h1><div style="margin-top:7px"><span class="ip-status">${esc(i.status||'Draft')}</span></div></div>
      <div class="ip-number"><b>Invoice #${esc(i.number)}</b><br>Date: ${esc(fmt(i.date))}<br>Due: ${esc(fmt(i.dueDate))}</div>
    </div>
    <div class="ip-grid">
      <div class="ip-box"><h3>Bill To</h3><div><b>${esc(cname(c))}</b><br>${c.address?esc(c.address)+'<br>':''}${esc(clientAddr)}${c.email?'<br>'+esc(c.email):''}${c.phone?'<br>'+esc(c.phone):''}</div></div>
      <div class="ip-box"><h3>Matter Information</h3><div><b>${esc(caseLabel)}</b><br>Case #: ${esc(cs.caseNumber||'—')}<br>Court: ${esc(cs.court||'—')}</div></div>
    </div>
    <table class="ip-table"><thead><tr><th>Description of Legal Services</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody><tr><td>${esc(i.description||'Legal services rendered')}</td><td class="ip-amount">${money(i.amount)}</td></tr></tbody></table>
    <div class="ip-total"><span>Amount Due</span><span>${money(i.amount)}</span></div>
    ${i.note?`<div class="ip-note"><b>Invoice Note</b><br>${esc(i.note)}</div>`:''}
  </div>
  <div class="ip-footer">${esc(f.name)} &nbsp; • &nbsp; ${esc(f.address)}, ${esc(f.city)} &nbsp; • &nbsp; ${esc(f.phone)}<br>Thank you for choosing our firm.</div>`;
}
function viewInvoice(id){
  location.href=`invoice-preview.html?id=${encodeURIComponent(id)}`;
}
function printInvoice(id){
  location.href=`invoice-preview.html?id=${encodeURIComponent(id)}&print=1`;
}
async function saveInvoice(id){
  const i=load(S.invoices).find(x=>x.id===id);if(!i)return;
  const body=buildInvoiceHTML(id);
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(i.number)}</title>
  <style>
  *{box-sizing:border-box}body{margin:0;padding:34px;background:#eef1f4;font-family:Arial,Helvetica,sans-serif;color:#17293e}
  .sheet{max-width:850px;margin:0 auto;background:#fff;border:1px solid #d6dbe0}
  .ip-head{background:linear-gradient(135deg,#071c31,#0d355a);color:#fff;padding:30px 34px;display:flex;justify-content:space-between;gap:30px;border-bottom:5px solid #d2a44b}
  .ip-brand{font-family:Georgia,serif;font-size:27px;font-weight:bold}.ip-contact{text-align:right;color:#f2dfae;font-size:12px;line-height:1.6}.ip-body{padding:30px 34px}
  .ip-title{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}.ip-title h1{margin:0;font:700 36px Georgia,serif;color:#0b2948}.ip-number{text-align:right;color:#667382;font-size:13px;line-height:1.6}
  .ip-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:20px 0 26px}.ip-box{border:1px solid #dfe3e7;border-radius:7px;overflow:hidden}.ip-box h3{margin:0;padding:9px 12px;background:#f4ead3;color:#6b4b13;font-size:11px;text-transform:uppercase;letter-spacing:.7px}.ip-box div{padding:12px;font-size:13px;line-height:1.55}
  .ip-table{width:100%;border-collapse:collapse;margin-top:18px}.ip-table th{background:#0b2948;color:#fff;padding:11px 12px;text-align:left;font-size:12px}.ip-table td{padding:15px 12px;border-bottom:1px solid #e0e3e6}.ip-amount{text-align:right;font-weight:bold}
  .ip-total{margin:22px 0 0 auto;width:320px;border-top:3px solid #d2a44b;padding-top:12px;display:flex;justify-content:space-between;font:700 22px Georgia,serif}.ip-note{margin-top:28px;background:#f8f6f1;border-left:4px solid #d2a44b;padding:14px 16px;font-size:13px;line-height:1.55}.ip-status{display:inline-block;padding:5px 10px;border-radius:999px;background:#f4ead3;color:#725115;font-weight:bold;font-size:11px}.ip-footer{margin-top:34px;background:#081f35;color:#e9d39e;text-align:center;padding:15px 20px;font-size:11px;line-height:1.55}
  </style></head><body><div class="sheet">${body}</div></body></html>`;
  if(window.desktopSaveTextFile){
    const r=await window.desktopSaveTextFile(`Invoice_${i.number}.html`,html);
    if(r&&r.ok)toast('Invoice saved');
  }
}
function renderInvoicePreviewPage(){
  const id=qs('id'), holder=document.getElementById('invoicePreview');
  if(!holder)return;
  holder.innerHTML=buildInvoiceHTML(id)||'<div style="padding:30px">Invoice not found.</div>';
  const i=load(S.invoices).find(x=>x.id===id);
  document.title=i?`Invoice ${i.number} — Rodriguez Law Firm`:'Invoice Preview';
  if(qs('print')==='1')setTimeout(()=>window.print(),300);
}
async function saveCurrentInvoice(){const id=qs('id');await saveInvoice(id)}

/* Replace invoice action rendering with View / Save / Print / Email. */
function renderInvoices(caseId){
  let box=document.getElementById('caseInvoicesList');if(!box)return;
  let rows=load(S.invoices).filter(i=>i.caseId===caseId).slice().reverse();
  box.innerHTML=rows.map(i=>`<div class="timeline-item">
    <div class="actions" style="justify-content:space-between">
      <strong>${esc(i.number)} — ${money(i.amount)}</strong>
      <div class="invoice-actions">
        <button class="btn btn-small btn-secondary" onclick="viewInvoice('${i.id}')">View</button>
        <button class="btn btn-small btn-secondary" onclick="saveInvoice('${i.id}')">Save</button>
        <button class="btn btn-small btn-secondary" onclick="printInvoice('${i.id}')">Print</button>
        <button class="btn btn-small btn-secondary" onclick="emailInvoice('${i.id}')">Email</button>
        <button class="btn btn-small btn-secondary" onclick="editInvoice('${i.id}')">Edit</button>
        <button class="btn btn-small btn-danger" onclick="deleteInvoice('${i.id}')">Delete</button>
      </div>
    </div>
    <div class="sub">${fmt(i.date)} • Due ${fmt(i.dueDate)} • <span class="invoice-status ${String(i.status).toLowerCase().replace(/ /g,'-')}">${esc(i.status)}</span></div>
    <div class="body">${esc(i.description||'')}</div>
  </div>`).join('')||'<div class="empty"><strong>No invoices yet.</strong></div>';
}
function invoicesInit(){
  let cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c])),rows=load(S.invoices).slice().reverse();
  let pg=typeof paginateRows==='function'?paginateRows(rows,listPages.invoices,STANDARD_PAGE_SIZE):{rows,page:1,totalPages:1,total:rows.length};
  if(typeof setPagers==='function'){listPages.invoices=pg.page;setPagers('invoices',pg.page,pg.totalPages,pg.total)}
  invoicesBody.innerHTML=pg.rows.map(i=>`<tr>
    <td><a class="link" href="case-detail.html?id=${i.caseId}">${esc(i.number)}</a></td>
    <td>${esc(cname(cm[i.clientId]))}</td><td>${esc(cases[i.caseId]?.caseType||'')}</td>
    <td>${fmt(i.date)}</td><td>${money(i.amount)}</td>
    <td><span class="invoice-status ${String(i.status).toLowerCase().replace(/ /g,'-')}">${esc(i.status)}</span></td>
    <td><div class="invoice-actions">
      <button class="btn btn-small btn-secondary" onclick="viewInvoice('${i.id}')">View</button>
      <button class="btn btn-small btn-secondary" onclick="saveInvoice('${i.id}')">Save</button>
      <button class="btn btn-small btn-secondary" onclick="printInvoice('${i.id}')">Print</button>
    </div></td></tr>`).join('')||'<tr><td colspan="7" class="empty"><strong>No invoices.</strong></td></tr>';
}

/* ===== Desktop v9 finance / invoice / payment fixes ===== */
function numMoney(v){if(typeof v==='number')return Number.isFinite(v)?v:0;return +(String(v??'').replace(/[$,\s]/g,''))||0}
function invoiceForPayment(p){if(!p||!p.invoiceId)return null;return load(S.invoices).find(i=>i.id===p.invoiceId)||null}
function caseQuotedAmount(caseId){
  const invoices=load(S.invoices).filter(i=>i.caseId===caseId);
  const invTotal=invoices.reduce((s,i)=>s+numMoney(i.amount),0);
  if(invTotal>0)return invTotal;
  const cs=getCase(caseId)||{};
  return numMoney(cs.serviceQuote);
}
function invoicePaidAmount(invoiceId,throughPaymentId=null){
  let rows=load(S.payments).filter(p=>p.invoiceId===invoiceId);
  rows.sort((a,b)=>String(a.date||a.createdAt||'').localeCompare(String(b.date||b.createdAt||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  let total=0;
  for(const p of rows){total+=numMoney(p.amount);if(throughPaymentId&&p.id===throughPaymentId)break}
  return total;
}
function paymentBalanceAfter(p){
  const inv=invoiceForPayment(p);
  if(inv)return Math.max(0,numMoney(inv.amount)-invoicePaidAmount(inv.id,p.id));
  const quote=caseQuotedAmount(p.caseId);
  const rows=load(S.payments).filter(x=>x.caseId===p.caseId).sort((a,b)=>String(a.date||a.createdAt||'').localeCompare(String(b.date||b.createdAt||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  let paid=0;for(const row of rows){paid+=numMoney(row.amount);if(row.id===p.id)break}
  return Math.max(0,quote-paid);
}
function renderDashPayments(){
  const ps=load(S.payments),cases=load(S.cases),cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c]));
  let quoted=0,paid=0;
  const rows=cases.map(cs=>{
    const q=caseQuotedAmount(cs.id),cps=ps.filter(p=>p.caseId===cs.id),p=cps.reduce((s,x)=>s+numMoney(x.amount),0),latest=cps.map(x=>x.date||x.createdAt||'').sort().pop()||'';
    quoted+=q;paid+=p;return{cs,q,p,b:Math.max(0,q-p),latest}
  }).filter(r=>r.q>0||r.p>0).sort((a,b)=>String(b.latest).localeCompare(String(a.latest)));
  if(typeof paymentsBody!=='undefined'&&paymentsBody)paymentsBody.innerHTML=rows.slice(0,5).map(r=>`<tr><td><a class="link" href="case-detail.html?id=${r.cs.id}">${esc(cname(cm[r.cs.clientId]))}</a></td><td>${money(r.q)}</td><td>${money(r.p)}</td><td>${money(r.b)}</td></tr>`).join('')||'<tr><td colspan="4" style="height:46px;color:#718092">No payment activity.</td></tr>';
  if(typeof totalQuote!=='undefined'&&totalQuote)totalQuote.textContent=money(quoted);
  if(typeof totalPaid!=='undefined'&&totalPaid)totalPaid.textContent=money(paid);
  if(typeof totalBalance!=='undefined'&&totalBalance)totalBalance.textContent=money(Math.max(0,quoted-paid));
}
function effectiveInvoiceStatus(i){if(!i)return'Quote';const paid=invoicePaidAmount(i.id),amount=numMoney(i.amount);if(amount>0&&paid>=amount)return'Paid';if(paid>0)return'Partially Paid';return i.status==='Paid'||i.status==='Draft'?'Quote':(i.status||'Quote')}
function invoiceBalance(i){return Math.max(0,numMoney(i.amount)-invoicePaidAmount(i.id))}
function addAgreedFeeToInvoice(){
  const fee=document.getElementById('serviceQuote'),form=document.getElementById('invoiceForm');if(!form)return;
  const val=numMoney(fee?.value);if(!val){alert('Enter the Service Quote / Agreed Fee first.');return}
  const amount=form.querySelector('[name="amount"]');if(amount)amount.value=val.toFixed(2);
  form.scrollIntoView({behavior:'smooth',block:'center'});toast('Agreed fee added to invoice amount');
}
function renderPayments(caseId){
  const box=document.getElementById('casePaymentsList');if(!box)return;
  const rows=load(S.payments).filter(p=>p.caseId===caseId).sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')));
  box.innerHTML=rows.map(p=>{const inv=invoiceForPayment(p),bal=paymentBalanceAfter(p);return`<div class="payment-card"><div class="payment-card-head"><div><strong>${money(p.amount)}</strong><div class="payment-meta">${fmt(p.date)} • ${esc(p.method||'')}</div></div><div class="payment-balance">Balance: ${money(bal)}</div></div><div class="payment-card-body">${inv?`Applied to <strong>Invoice #${esc(inv.number)}</strong> • Invoice amount ${money(inv.amount)}`:'Not assigned to an invoice'}${p.reference?`<br>Reference: ${esc(p.reference)}`:''}${p.note?`<br>${esc(p.note)}`:''}<div class="payment-actions"><button class="btn btn-small btn-secondary" onclick="viewPayment('${p.id}')">View</button><button class="btn btn-small btn-secondary" onclick="savePayment('${p.id}')">Save</button><button class="btn btn-small btn-secondary" onclick="printPayment('${p.id}')">Print</button><button class="btn btn-small btn-secondary" onclick="emailPayment('${p.id}')">Email</button></div></div></div>`}).join('')||'<div class="empty"><strong>No payments recorded.</strong></div>';
}
function buildPaymentHTML(id){
  const p=load(S.payments).find(x=>x.id===id);if(!p)return'';
  const cs=getCase(p.caseId)||{},c=getClient(p.clientId)||{},f=firmInvoiceInfo(),inv=invoiceForPayment(p),bal=paymentBalanceAfter(p),original=inv?numMoney(inv.amount):caseQuotedAmount(p.caseId),invText=inv?`Invoice #${esc(inv.number)}`:'Case balance',clientAddr=[c.city,c.state,c.zip].filter(Boolean).join(', ');
  return`<div class="r-head"><div><div class="r-brand">${esc(f.name)}</div><div style="margin-top:7px;color:#e9d39e;font-size:12px">Payment Receipt</div></div><div class="r-contact">${esc(f.address)}<br>${esc(f.city)}<br>${esc(f.phone)}</div></div><div class="r-body"><div class="r-title"><div><h1>PAYMENT RECEIPT</h1><div style="color:#6a7682;margin-top:6px">${invText}</div></div><div style="text-align:right;font-size:13px;line-height:1.65"><b>${fmt(p.date)}</b><br>${esc(p.method||'')}${p.reference?'<br>Ref: '+esc(p.reference):''}</div></div><div class="r-grid"><div class="r-box"><h3>Received From</h3><div><b>${esc(cname(c))}</b><br>${c.address?esc(c.address)+'<br>':''}${esc(clientAddr)}${c.email?'<br>'+esc(c.email):''}</div></div><div class="r-box"><h3>Matter</h3><div><b>${esc([cs.caseType,cs.subCaseType].filter(Boolean).join(' — ')||'Legal Matter')}</b><br>Case #: ${esc(cs.caseNumber||'—')}<br>${inv?`Invoice #${esc(inv.number)}`:'No invoice selected'}</div></div></div><div class="r-amount"><div class="r-row"><span>Original Amount</span><span>${money(original)}</span></div><div class="r-row"><span>Payment Received</span><span>${money(p.amount)}</span></div><div class="r-row big"><span>Balance After Payment</span><span>${money(bal)}</span></div></div>${p.note?`<div class="r-note"><b>Payment Note</b><br>${esc(p.note)}</div>`:''}</div><div class="r-footer">${esc(f.name)} &nbsp; • &nbsp; ${esc(f.address)}, ${esc(f.city)} &nbsp; • &nbsp; ${esc(f.phone)}<br>Thank you. This receipt reflects the payment recorded above.</div>`;
}
function viewPayment(id){location.href=`payment-preview.html?id=${encodeURIComponent(id)}`}
function printPayment(id){location.href=`payment-preview.html?id=${encodeURIComponent(id)}&print=1`}
async function savePayment(id){
  const p=load(S.payments).find(x=>x.id===id);if(!p)return;const body=buildPaymentHTML(id);
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt</title><style>*{box-sizing:border-box}body{margin:0;padding:34px;background:#eef1f4;font-family:Arial,Helvetica,sans-serif;color:#17293e}.sheet{max-width:850px;margin:0 auto;background:#fff;border:1px solid #d6dbe0}.r-head{background:linear-gradient(135deg,#071c31,#0d355a);color:#fff;padding:30px 34px;display:flex;justify-content:space-between;gap:30px;border-bottom:5px solid #d2a44b}.r-brand{font-family:Georgia,serif;font-size:27px;font-weight:bold}.r-contact{text-align:right;color:#f2dfae;font-size:12px;line-height:1.6}.r-body{padding:30px 34px}.r-title{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}.r-title h1{margin:0;font:700 34px Georgia,serif;color:#0b2948}.r-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:20px 0 26px}.r-box{border:1px solid #dfe3e7;border-radius:7px;overflow:hidden}.r-box h3{margin:0;padding:9px 12px;background:#f4ead3;color:#6b4b13;font-size:11px;text-transform:uppercase;letter-spacing:.7px}.r-box div{padding:12px;font-size:13px;line-height:1.6}.r-amount{margin:25px 0 0 auto;width:360px;border-top:3px solid #d2a44b;padding-top:14px}.r-row{display:flex;justify-content:space-between;font-size:16px;padding:5px 0}.r-row.big{font:700 22px Georgia,serif;color:#0b2948}.r-note{margin-top:25px;background:#f8f6f1;border-left:4px solid #d2a44b;padding:14px 16px;font-size:13px}.r-footer{margin-top:34px;background:#081f35;color:#e9d39e;text-align:center;padding:15px 20px;font-size:11px;line-height:1.55}</style></head><body><div class="sheet">${body}</div></body></html>`;
  const r=window.desktopSaveTextFile?await window.desktopSaveTextFile(`Payment_Receipt_${String(p.date||'').replace(/-/g,'')}.html`,html):null;if(r&&r.ok)toast('Payment receipt saved');else if(r&&r.error)alert(r.error)
}
function emailPayment(id){
  const p=load(S.payments).find(x=>x.id===id);if(!p)return;const c=getClient(p.clientId)||{},cs=getCase(p.caseId)||{},inv=invoiceForPayment(p);
  const subject=`Payment Receipt${inv?' - Invoice #'+inv.number:''}`,body=`Rodriguez Law Firm, LLC\n\nPayment received from: ${cname(c)}\nCase: ${cs.caseNumber||''}\n${inv?'Invoice #'+inv.number+'\n':''}Payment date: ${fmt(p.date)}\nAmount received: ${money(p.amount)}\nBalance after payment: ${money(paymentBalanceAfter(p))}\n\nThank you,\nRodriguez Law Firm, LLC\n(203) 630-0406`;
  location.href=`mailto:${encodeURIComponent(c.email||'')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
function renderPaymentPreviewPage(){const id=qs('id'),holder=document.getElementById('paymentPreview');if(!holder)return;holder.innerHTML=buildPaymentHTML(id)||'<div style="padding:30px">Payment not found.</div>';if(qs('print')==='1')setTimeout(()=>window.print(),300)}
function renderCaseReportPreviewPage(){
  const id=qs('id');
  const holder=document.getElementById('caseReportPreview');
  if(!holder)return;

  const cs=getCase(id);
  if(!cs){
    holder.innerHTML='<div style="padding:30px">Case not found.</div>';
    return;
  }

  const c=getClient(cs.clientId)||{};
  const notes=load(S.notes).filter(x=>x.caseId===cs.id);
  const tasks=load(S.tasks).filter(x=>x.caseId===cs.id);
  const pays=load(S.payments).filter(x=>x.caseId===cs.id);
  const docs=load(S.docs).filter(x=>x.caseId===cs.id);
  const f=firmInvoiceInfo();

  const section=(title,content)=>`
    <div style="margin-top:22px;border:1px solid #dfe3e7;border-radius:7px;overflow:hidden">
      <div style="padding:9px 13px;background:#f4ead3;color:#6b4b13;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.7px">
        ${title}
      </div>
      <div style="padding:14px 16px;font-size:13px;line-height:1.6">
        ${content}
      </div>
    </div>`;

  holder.innerHTML=`
    <div style="background:linear-gradient(135deg,#071c31,#0d355a);color:#fff;padding:30px 34px;display:flex;justify-content:space-between;gap:30px;border-bottom:5px solid #d2a44b">
      <div style="font-family:Georgia,serif;font-size:27px;font-weight:bold">
        ${esc(f.name)}
      </div>
      <div style="text-align:right;color:#f2dfae;font-size:12px;line-height:1.6">
        ${esc(f.address)}<br>
        ${esc(f.city)}<br>
        ${esc(f.phone)}
      </div>
    </div>

    <div style="padding:30px 34px;color:#17293e">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px">
        <div>
          <h1 style="margin:0;font:700 36px Georgia,serif;color:#0b2948">
            Case Report
          </h1>
          <div style="margin-top:7px;color:#667382;font-size:13px">
            Comprehensive Case Summary
          </div>
        </div>

        <div style="text-align:right;font-size:13px;line-height:1.6;color:#667382">
          <b style="color:#0b2948">Case #</b><br>
          ${esc(cs.caseNumber||'—')}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">

        <div style="border:1px solid #dfe3e7;border-radius:7px;overflow:hidden">
          <div style="padding:9px 12px;background:#f4ead3;color:#6b4b13;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.7px">
            Client
          </div>
          <div style="padding:13px;font-size:13px;line-height:1.6">
            <b>${esc(cname(c))}</b><br>
            ${c.phone?esc(c.phone)+'<br>':''}
            ${c.email?esc(c.email):''}
          </div>
        </div>

        <div style="border:1px solid #dfe3e7;border-radius:7px;overflow:hidden">
          <div style="padding:9px 12px;background:#f4ead3;color:#6b4b13;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.7px">
            Case Information
          </div>
          <div style="padding:13px;font-size:13px;line-height:1.6">
            <b>${esc(cs.caseType||'Legal Matter')}</b>
            ${cs.subCaseType?' — '+esc(cs.subCaseType):''}<br>
            Status: <b>${esc(cs.caseStatus||'—')}</b><br>
            Agreed Fee: <b>${money(cs.serviceQuote)}</b>
          </div>
        </div>

      </div>

      ${section('Case Notes',
        `<div>${esc(cs.caseNotes||'No case notes recorded.')}</div>`
      )}

      ${section('Upcoming Dates',
        `<b>Court Date:</b> ${fmt(cs.nextCourtDate)}${cs.nextCourtDateNote?' — '+esc(cs.nextCourtDateNote):''}<br>
         <b>Legal Date:</b> ${fmt(cs.nextLegalDate)}${cs.nextLegalDateNote?' — '+esc(cs.nextLegalDateNote):''}`
      )}

      ${section('Running Notes',
        notes.length
          ? notes.map(n=>`<div style="padding:8px 0;border-bottom:1px solid #eceff1">${esc(n.text)}</div>`).join('')
          : 'No running notes.'
      )}

      ${section('Tasks',
        tasks.length
          ? tasks.map(t=>`
              <div style="padding:8px 0;border-bottom:1px solid #eceff1">
                <b>${esc(t.text)}</b><br>
                <span style="color:#667382">
                  Due: ${fmt(t.dueDate)}${t.priority?' • '+esc(t.priority):''}${t.done?' • Completed':' • Open'}
                </span>
              </div>`).join('')
          : 'No tasks.'
      )}

      ${section('Payments',
        pays.length
          ? pays.map(p=>`
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eceff1">
                <span>${fmt(p.date)} — ${esc(p.method||'Payment')}</span>
                <b>${money(p.amount)}</b>
              </div>`).join('')
          : 'No payments recorded.'
      )}

      ${section('Documents',
        docs.length
          ? docs.map(d=>`
              <div style="padding:8px 0;border-bottom:1px solid #eceff1">
                <b>${esc(d.title)}</b><br>
                <span style="color:#667382">${esc(d.fileName||'')}</span>
              </div>`).join('')
          : 'No documents recorded.'
      )}

    </div>

    <div style="background:#081f35;color:#e9d39e;text-align:center;padding:15px 20px;font-size:11px;line-height:1.55">
      ${esc(f.name)} &nbsp; • &nbsp; ${esc(f.address)}, ${esc(f.city)} &nbsp; • &nbsp; ${esc(f.phone)}
      <br>
      Confidential Attorney Case Report
    </div>
  `;

  if(qs('print')==='1')setTimeout(()=>window.print(),300);
}
async function saveCurrentPayment(){await savePayment(qs('id'))}
function emailCurrentPayment(){emailPayment(qs('id'))}
async function saveInvoice(id){
  const i=load(S.invoices).find(x=>x.id===id);if(!i)return;const body=buildInvoiceHTML(id);
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(i.number)}</title><style>*{box-sizing:border-box}body{margin:0;padding:34px;background:#eef1f4;font-family:Arial,Helvetica,sans-serif;color:#17293e}.sheet{max-width:850px;margin:0 auto;background:#fff;border:1px solid #d6dbe0}.ip-head{background:linear-gradient(135deg,#071c31,#0d355a);color:#fff;padding:30px 34px;display:flex;justify-content:space-between;gap:30px;border-bottom:5px solid #d2a44b}.ip-brand{font-family:Georgia,serif;font-size:27px;font-weight:bold}.ip-contact{text-align:right;color:#f2dfae;font-size:12px;line-height:1.6}.ip-body{padding:30px 34px}.ip-title{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}.ip-title h1{margin:0;font:700 36px Georgia,serif;color:#0b2948}.ip-number{text-align:right;color:#667382;font-size:13px;line-height:1.6}.ip-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:20px 0 26px}.ip-box{border:1px solid #dfe3e7;border-radius:7px;overflow:hidden}.ip-box h3{margin:0;padding:9px 12px;background:#f4ead3;color:#6b4b13;font-size:11px;text-transform:uppercase;letter-spacing:.7px}.ip-box div{padding:12px;font-size:13px;line-height:1.55}.ip-table{width:100%;border-collapse:collapse;margin-top:18px}.ip-table th{background:#0b2948;color:#fff;padding:11px 12px;text-align:left;font-size:12px}.ip-table td{padding:15px 12px;border-bottom:1px solid #e0e3e6}.ip-amount{text-align:right;font-weight:bold}.ip-total{margin:22px 0 0 auto;width:320px;border-top:3px solid #d2a44b;padding-top:12px;display:flex;justify-content:space-between;font:700 22px Georgia,serif}.ip-note{margin-top:28px;background:#f8f6f1;border-left:4px solid #d2a44b;padding:14px 16px;font-size:13px;line-height:1.55}.ip-status{display:inline-block;padding:5px 10px;border-radius:999px;background:#f4ead3;color:#725115;font-weight:bold;font-size:11px}.ip-footer{margin-top:34px;background:#081f35;color:#e9d39e;text-align:center;padding:15px 20px;font-size:11px;line-height:1.55}</style></head><body><div class="sheet">${body}</div></body></html>`;
  if(!window.desktopSaveTextFile){alert('Desktop Save is unavailable.');return}const r=await window.desktopSaveTextFile(`Invoice_${i.number}.html`,html);if(r&&r.ok)toast('Invoice saved');else if(r&&r.error)alert('Could not save invoice: '+r.error)
}
let editingInvoiceId=null;
async function deleteInvoice(id){
  const invoices=load(S.invoices);
  const invoice=invoices.find(x=>x.id===id);
  if(!invoice){alert('Invoice not found.');return;}

  const linkedPayments=load(S.payments).filter(p=>p.invoiceId===id);
  let message=`Delete invoice #${invoice.number || ''}?`;
  if(linkedPayments.length){
    message+=`\n\n${linkedPayments.length} payment${linkedPayments.length===1?' is':'s are'} linked to this invoice. The payment record${linkedPayments.length===1?' will':'s will'} be kept, but unlinked from the deleted invoice.`;
  }
  if(!confirm(message))return;

  try{
    if(linkedPayments.length){
      const payments=load(S.payments).map(p=>p.invoiceId===id?{...p,invoiceId:''}:p);
      await save(S.payments,payments);
    }
    await save(S.invoices,invoices.filter(x=>x.id!==id));

    if(editingInvoiceId===id)editingInvoiceId=null;
    const caseId=invoice.caseId;
    if(document.getElementById('caseInvoicesList'))renderInvoices(caseId);
    if(document.getElementById('casePaymentsList'))renderPayments(caseId);
    if(document.getElementById('invoicesBody'))invoicesInit();
    toast('Invoice deleted');
  }catch(err){
    alert('Could not delete invoice from cloud: '+(err?.message||err));
  }
}

function editInvoice(id){
  const i=load(S.invoices).find(x=>x.id===id),form=document.getElementById('invoiceForm');if(!i||!form)return;editingInvoiceId=id;
  const set=(name,val)=>{const el=form.querySelector(`[name="${name}"]`);if(el)el.value=val??''};
  set('number',i.number);set('status',i.status==='Draft'?'Quote':(i.status==='Paid'?'Sent':i.status));set('date',i.date);set('dueDate',i.dueDate);set('description',i.description);set('amount',i.amount);set('note',i.note);
  const submit=form.querySelector('button[type="submit"],button:not([type])');if(submit)submit.textContent='Update Invoice';
  form.scrollIntoView({behavior:'smooth',block:'center'})
}
document.addEventListener('submit',function(e){
  if(!editingInvoiceId||!e.target||e.target.id!=='invoiceForm')return;e.preventDefault();e.stopImmediatePropagation();
  const form=e.target,f=new FormData(form),rows=load(S.invoices),idx=rows.findIndex(x=>x.id===editingInvoiceId);if(idx<0){editingInvoiceId=null;return}
  rows[idx]={...rows[idx],status:String(f.get('status')||'Quote'),date:String(f.get('date')||''),dueDate:String(f.get('dueDate')||''),description:String(f.get('description')||''),amount:numMoney(f.get('amount')),note:String(f.get('note')||'')};
  save(S.invoices,rows);const caseId=rows[idx].caseId;editingInvoiceId=null;form.reset();const n=form.querySelector('[name="number"]');if(n)n.value=nextInvoiceNumber();const btn=form.querySelector('button[type="submit"],button:not([type])');if(btn)btn.textContent='Save Invoice';renderInvoices(caseId);renderPayments(caseId);toast('Invoice updated')
},true);
const _buildInvoiceHTML_v9=buildInvoiceHTML;
buildInvoiceHTML=function(id,includeToolbar=false){let html=_buildInvoiceHTML_v9(id,includeToolbar),i=load(S.invoices).find(x=>x.id===id);if(!i)return html;html=html.replace(/<span class="ip-status">.*?<\/span>/,`<span class="ip-status">${esc(effectiveInvoiceStatus(i))}</span>`);html=html.replace(/<span>Amount Due<\/span><span>.*?<\/span>/,`<span>Amount Due</span><span>${money(invoiceBalance(i))}</span>`);return html};

function renderAllPaymentsTable(){
  const body=document.getElementById('allPaymentsBody');if(!body)return;const cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c])),invs=Object.fromEntries(load(S.invoices).map(i=>[i.id,i])),rows=load(S.payments).slice().sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')));
  body.innerHTML=rows.map(p=>`<tr><td>${fmt(p.date)}</td><td><a class="link" href="case-detail.html?id=${p.caseId}">${esc(cname(cm[p.clientId]))}</a></td><td>${esc(cases[p.caseId]?.caseNumber||cases[p.caseId]?.caseType||'')}</td><td>${p.invoiceId&&invs[p.invoiceId]?'#'+esc(invs[p.invoiceId].number):'—'}</td><td>${money(p.amount)}</td><td>${money(paymentBalanceAfter(p))}</td><td>${esc(p.method||'')}</td><td><div class="payment-actions"><button class="btn btn-small btn-secondary" onclick="viewPayment('${p.id}')">View</button><button class="btn btn-small btn-secondary" onclick="savePayment('${p.id}')">Save</button><button class="btn btn-small btn-secondary" onclick="printPayment('${p.id}')">Print</button><button class="btn btn-small btn-secondary" onclick="emailPayment('${p.id}')">Email</button></div></td></tr>`).join('')||'<tr><td colspan="8" class="empty"><strong>No payments recorded.</strong></td></tr>';
}
const _paymentsInit_v9=paymentsInit;paymentsInit=function(){_paymentsInit_v9();renderAllPaymentsTable()};

/* ===== RCM v2 Cloud account, sync, past-due, safeguards ===== */

async function desktopApiReady(){
  if(window.pywebview&&window.pywebview.api)return true;
  await new Promise(resolve=>{const done=()=>resolve();window.addEventListener('pywebviewready',done,{once:true});setTimeout(done,1500)});
  return !!(window.pywebview&&window.pywebview.api);
}

const _settingsInit_v10=settingsInit;
settingsInit=async function(){
  _settingsInit_v10();
  await refreshCloudAccountState();
};
async function refreshCloudAccountState(){
  const el=document.getElementById('securityState');if(!el)return;
  await desktopApiReady();
  const s=await window.pywebview.api.auth_status();
  if(s&&s.authenticated){
    const u=s.user||{},name=[u.first_name,u.last_name].filter(Boolean).join(' ');
    el.textContent='SIGNED IN — '+(name||u.email||'User')+' ('+(u.role||'staff')+')';
    el.className='status-active';
  }else{el.textContent='SIGNED OUT';el.className='status-closed'}
}
async function enableSecurity(){ alert('RCM v2 Cloud uses each employee’s email and password. The old shared 5-digit PIN is no longer used.'); }
async function disableSecurity(){ alert('Cloud account security cannot be disabled. Each employee signs in with their own account.'); }
async function backupNow(){ const msg=document.getElementById('backupStatus');if(msg)msg.textContent='Your shared RCM data is stored in Supabase. Local SQLite backup is disabled in v2 Cloud.'; }
async function restoreBackup(){ const msg=document.getElementById('backupStatus');if(msg)msg.textContent='Local SQLite restore is disabled because it could overwrite shared cloud data.'; }
async function openBackupFolder(){ const msg=document.getElementById('backupStatus');if(msg)msg.textContent='RCM v2 Cloud does not use the old local backup folder.'; }
async function signOutCloud(){ if(window.desktopSignOut) await window.desktopSignOut(); }

/* Past due is automatic: due date has passed AND an unpaid balance remains. */
function pastDueInvoices(){
  const today=new Date();today.setHours(0,0,0,0);
  return load(S.invoices).map(i=>{
    const due=i.dueDate?new Date(i.dueDate+'T12:00:00'):null;
    const remaining=invoiceBalance(i);
    return {i,due,remaining};
  }).filter(x=>x.due && x.due<today && x.remaining>0)
    .sort((a,b)=>String(a.i.dueDate).localeCompare(String(b.i.dueDate)));
}
function pastDueInit(){
  const rows=pastDueInvoices(),cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c]));
  pastDueCount.textContent=rows.length;
  pastDueTotal.textContent=money(rows.reduce((s,x)=>s+x.remaining,0));
  pastDueBody.innerHTML=rows.map(x=>{
    const i=x.i,cs=cases[i.caseId],c=cm[i.clientId];
    return `<tr class="past-due-row">
      <td><a class="link" href="case-detail.html?id=${i.caseId}">${esc(cname(c))}</a></td>
      <td><a class="link" href="case-detail.html?id=${i.caseId}">${esc(cs?.caseNumber||cs?.caseType||'—')}</a></td>
      <td><a class="link" href="invoice-preview.html?id=${i.id}">#${esc(i.number)}</a></td>
      <td>${money(i.amount)}</td><td>${money(x.remaining)}</td><td class="past-due-amount">${money(x.remaining)}</td><td>${fmt(i.dueDate)}</td>
    </tr>`;
  }).join('')||'<tr><td colspan="7" class="empty"><strong>No past due invoices.</strong></td></tr>';
}
const _dashboardInit_v10=dashboardInit;
dashboardInit=function(){_dashboardInit_v10();}

/* Effective invoice status: payment and due date override manual status. */
effectiveInvoiceStatus=function(i){
  if(!i)return'Quote';
  const paid=invoicePaidAmount(i.id),amount=numMoney(i.amount);
  if(amount>0&&paid>=amount)return'Paid';
  const due=i.dueDate?new Date(i.dueDate+'T12:00:00'):null,today=new Date();today.setHours(0,0,0,0);
  if(due&&due<today&&amount-paid>0)return'Past Due';
  if(paid>0)return'Partially Paid';
  return i.status==='Paid'||i.status==='Draft'?'Quote':(i.status||'Quote')
};

/* Payment safeguard: cumulative payments may never exceed selected invoice remaining balance. */
document.addEventListener('submit',function(e){
  if(!e.target||e.target.id!=='paymentForm')return;
  const f=new FormData(e.target),invoiceId=String(f.get('invoiceId')||''),amount=numMoney(f.get('amount'));
  if(amount<=0){e.preventDefault();e.stopImmediatePropagation();alert('Enter a payment amount greater than $0.');return}
  if(invoiceId){
    const inv=load(S.invoices).find(i=>i.id===invoiceId);
    if(inv){
      const remaining=invoiceBalance(inv);
      if(amount>remaining+0.0001){
        e.preventDefault();e.stopImmediatePropagation();
        alert(`Payment exceeds the remaining invoice balance.\n\nRemaining balance: ${money(remaining)}\nPayment entered: ${money(amount)}`);
        return;
      }
    }
  }
},true);

/* Case close safeguard. */
document.addEventListener('submit',function(e){
  if(!e.target||e.target.id!=='caseForm')return;
  const id=qs('id'),cs=getCase(id);if(!cs)return;
  const wanted=String(new FormData(e.target).get('caseStatus')||'');
  if(wanted==='Closed'&&cs.caseStatus!=='Closed'){
    const outstanding=Math.max(0,caseQuotedAmount(id)-load(S.payments).filter(p=>p.caseId===id).reduce((s,p)=>s+numMoney(p.amount),0));
    const openTasks=load(S.tasks).filter(t=>t.caseId===id&&!t.done).length;
    if(outstanding>0||openTasks>0){
      const text=`This case still has:${outstanding>0?`\n• Outstanding balance: ${money(outstanding)}`:''}${openTasks?`\n• Open tasks: ${openTasks}`:''}\n\nClose the case anyway?`;
      if(!confirm(text)){e.preventDefault();e.stopImmediatePropagation();const status=document.getElementById('caseStatus');if(status)status.value=cs.caseStatus;return}
    }
  }
},true);

/* Payment page: most recent 10 per page, sorted newest first. */
let paymentHistoryPage=1;
const PAYMENT_HISTORY_PAGE_SIZE=10;
function paymentSortValue(p){return String(p.date||'')+'|'+String(p.createdAt||'')}
renderAllPaymentsTable=function(){
  const body=document.getElementById('allPaymentsBody');if(!body)return;
  const cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c])),invs=Object.fromEntries(load(S.invoices).map(i=>[i.id,i]));
  const all=load(S.payments).slice().sort((a,b)=>paymentSortValue(b).localeCompare(paymentSortValue(a)));
  const totalPages=Math.max(1,Math.ceil(all.length/PAYMENT_HISTORY_PAGE_SIZE));
  paymentHistoryPage=Math.max(1,Math.min(paymentHistoryPage,totalPages));
  const start=(paymentHistoryPage-1)*PAYMENT_HISTORY_PAGE_SIZE,rows=all.slice(start,start+PAYMENT_HISTORY_PAGE_SIZE);
  body.innerHTML=rows.map(p=>`<tr><td>${fmt(p.date)}</td><td><a class="link" href="case-detail.html?id=${p.caseId}">${esc(cname(cm[p.clientId]))}</a></td><td>${esc(cases[p.caseId]?.caseNumber||cases[p.caseId]?.caseType||'')}</td><td>${p.invoiceId&&invs[p.invoiceId]?'#'+esc(invs[p.invoiceId].number):'—'}</td><td>${money(p.amount)}</td><td>${money(paymentBalanceAfter(p))}</td><td>${esc(p.method||'')}</td><td><div class="payment-actions"><button class="btn btn-small btn-secondary" onclick="viewPayment('${p.id}')">View</button><button class="btn btn-small btn-secondary" onclick="savePayment('${p.id}')">Save</button><button class="btn btn-small btn-secondary" onclick="printPayment('${p.id}')">Print</button><button class="btn btn-small btn-secondary" onclick="emailPayment('${p.id}')">Email</button></div></td></tr>`).join('')||'<tr><td colspan="8" class="empty"><strong>No payments recorded.</strong></td></tr>';
  ['paymentHistPageTop','paymentHistPageBottom'].forEach(id=>{const x=document.getElementById(id);if(x)x.textContent=`Page ${paymentHistoryPage} of ${totalPages}`});
  ['paymentHistBackTop','paymentHistBackBottom'].forEach(id=>{const x=document.getElementById(id);if(x)x.disabled=paymentHistoryPage<=1});
  ['paymentHistNextTop','paymentHistNextBottom'].forEach(id=>{const x=document.getElementById(id);if(x)x.disabled=paymentHistoryPage>=totalPages});
}
function changePaymentHistoryPage(delta){paymentHistoryPage+=delta;renderAllPaymentsTable()}

/* Keep invoice picker from offering fully paid invoices. */
const _renderPayments_v10=renderPayments;
renderPayments=function(caseId){
  _renderPayments_v10(caseId);
  const sel=document.querySelector('#paymentForm [name="invoiceId"]');
  if(sel){
    const inv=load(S.invoices).filter(i=>i.caseId===caseId&&invoiceBalance(i)>0);
    const current=sel.value;
    sel.innerHTML='<option value="">Not applied to invoice</option>'+inv.map(i=>`<option value="${i.id}">${esc(i.number)} — Remaining ${money(invoiceBalance(i))}</option>`).join('');
    if([...sel.options].some(o=>o.value===current))sel.value=current;
  }
};

/* ===== v11 notification refinement ===== */
function refreshNotificationBell(){
 const b=document.getElementById('notificationBadge');if(!b)return;
 const n=pastDueInvoices().length;b.hidden=n===0;b.textContent=n>99?'99+':String(n);
}
function openNotifications(){if(pastDueInvoices().length)location.href='past-due.html';else toast('No notifications')}
function renderPaymentsPastDueCard(){
 const c=document.getElementById('paymentsPastDueCard');if(!c)return;
 const r=pastDueInvoices(),total=r.reduce((s,x)=>s+x.remaining,0);
 document.getElementById('paymentsPastDueAmount').textContent=money(total);
 document.getElementById('paymentsPastDueMeta').textContent=`${r.length} overdue invoice${r.length===1?'':'s'}`;
 c.classList.toggle('has-past-due',r.length>0);
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{refreshNotificationBell();renderPaymentsPastDueCard()}catch(e){console.warn(e)}},200));


/* ===== RCM v2 FIX2: hybrid document sources + local user avatar + admin profile manager ===== */
function detectDocumentSource(path){
  const x=String(path||'').toLowerCase();
  if(x.includes('google drive')||x.includes('my drive')||x.includes('googledrive'))return 'google_drive';
  if(x.includes('onedrive'))return 'onedrive';
  if(x.includes('dropbox'))return 'dropbox';
  return 'local';
}
function sourceLabel(s){
  return ({google_drive:'◈ Google Drive',onedrive:'☁ OneDrive',dropbox:'◇ Dropbox',local:'▣ Local PC',other:'○ Other'})[s]||'▣ Local PC';
}
function sourceBadge(s){return `<span class="source-badge source-${esc(s||'local')}">${esc(sourceLabel(s))}</span>`}

attachDoc=async function(cs,c){
  let f=new FormData(docForm),title=String(f.get('title')||'').trim();
  if(!title){alert('Enter a Document Title first.');return}
  if(!window.desktopChooseFile){alert('Desktop file picker is not available.');return}
  let picked=await window.desktopChooseFile();
  if(!picked||!picked.path)return;
  let rows=load(S.docs),sourceType=detectDocumentSource(picked.path);
  rows.push({id:uid('doc'),caseId:cs.id,clientId:cs.clientId,clientName:cname(c),title,type:String(f.get('type')||''),note:String(f.get('note')||''),fileName:picked.name,filePath:picked.path,sourceType,cloudUrl:'',createdAt:now(),desktopPath:true});
  await save(S.docs,rows);docForm.reset();renderDocs(cs.id);toast(`Document linked • ${sourceLabel(sourceType)}`);
}
renderDocs=function(id){
  let rows=load(S.docs).filter(x=>x.caseId===id).slice().reverse();
  caseDocumentsList.innerHTML=rows.map(d=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(d.title)}</strong><div><button class="btn btn-small btn-secondary" onclick="openDoc('${d.id}')">Open</button> <button class="btn btn-small btn-danger" onclick="delItem('${S.docs}','${d.id}',()=>renderDocs('${id}'))">Delete</button></div></div><div class="sub">${sourceBadge(d.sourceType||detectDocumentSource(d.filePath))} &nbsp; ${esc(d.type||'Document')} • ${esc(d.fileName||'')}</div><div class="body">${esc(d.note||'')}</div></div>`).join('')||'<div class="empty"><strong>No documents.</strong></div>';
}
docsInit=function(){
  let all=load(S.docs).slice().reverse(),pg=paginateRows(all,listPages.documents||1,STANDARD_PAGE_SIZE);listPages.documents=pg.page;
  documentsBody.innerHTML=pg.rows.map(d=>`<tr><td><button class="btn btn-small btn-secondary" onclick="openDoc('${d.id}')">Open</button></td><td>${esc(d.clientName||'')}</td><td><a class="link" href="case-detail.html?id=${d.caseId}">${esc(d.title)}</a></td><td>${esc(d.type||'—')}</td><td>${sourceBadge(d.sourceType||detectDocumentSource(d.filePath))}<div class="sub">${esc(d.fileName||'')}</div></td><td>${d.createdAt?new Date(d.createdAt).toLocaleDateString():'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty"><strong>No documents linked.</strong></td></tr>';
  setPagers('documents',pg.page,pg.totalPages,pg.total);
}

async function chooseMyAvatar(){
  if(!(window.pywebview&&window.pywebview.api&&window.pywebview.api.choose_local_avatar))return;
  const r=await window.pywebview.api.choose_local_avatar();
  if(r&&r.ok&&r.data_url){document.querySelectorAll('.avatar-img').forEach(x=>x.src=r.data_url);toast('Local profile photo updated')}
  else if(r&&r.error)alert(r.error);
}
async function loadLocalAvatar(){
  try{if(window.pywebview&&window.pywebview.api&&window.pywebview.api.get_local_avatar){const r=await window.pywebview.api.get_local_avatar();if(r&&r.data_url)document.querySelectorAll('.avatar-img').forEach(x=>x.src=r.data_url)}}catch(e){}
}
function isAdminRole(r){return ['system_admin','admin','owner_admin'].includes(String(r||''))}
async function loadUserAdmin(){
  const panel=document.getElementById('userAdminPanel');if(!panel||!isAdminRole(window.__currentUser&&window.__currentUser.role))return;panel.hidden=false;
  const status=document.getElementById('userAdminStatus'),list=document.getElementById('userAdminList');status.textContent='Loading users…';
  try{const r=await window.pywebview.api.list_profiles();if(!r||!r.ok)throw new Error((r&&r.error)||'Could not load users');status.textContent='';
    const caller=(r.current_user||{}).role||'staff';list.innerHTML=(r.profiles||[]).map(u=>{const locked=u.role==='system_admin'&&caller!=='system_admin';return `<div class="user-admin-row" data-user-id="${esc(u.id)}"><div class="user-admin-name"><strong>${esc([u.first_name,u.last_name].filter(Boolean).join(' ')||'Unnamed User')}</strong><div class="sub">${esc(u.id)}</div></div><input class="ua-first" value="${esc(u.first_name||'')}" placeholder="First name"><input class="ua-last" value="${esc(u.last_name||'')}" placeholder="Last name"><select class="ua-role" ${locked?'disabled':''}><option value="staff">Staff</option><option value="secretary">Secretary</option><option value="attorney">Attorney</option><option value="billing">Billing</option><option value="admin">Firm Admin</option>${caller==='system_admin'?'<option value="system_admin">10xLABZ System Admin</option>':''}</select><label class="ua-active"><input type="checkbox" ${u.active!==false?'checked':''} ${locked?'disabled':''}> Active</label><button class="btn btn-small btn-secondary" ${locked?'disabled':''} onclick="saveManagedUser(this)">Save</button></div>`}).join('');
    (r.profiles||[]).forEach(u=>{const row=list.querySelector(`[data-user-id="${u.id}"]`);if(row)row.querySelector('.ua-role').value=u.role||'staff'});
  }catch(e){status.textContent=String(e.message||e)}
}
async function saveManagedUser(btn){
  const row=btn.closest('.user-admin-row'),id=row.dataset.userId,r=await window.pywebview.api.update_profile_admin(id,row.querySelector('.ua-first').value,row.querySelector('.ua-last').value,row.querySelector('.ua-role').value,row.querySelector('.ua-active input').checked);
  if(!r||!r.ok){alert((r&&r.error)||'Could not update user');return}toast('User updated');
}
function explainAddUser(){alert('Secure staff-account creation is the next server-side step. RCM will never store the Supabase secret key inside the desktop app. For this build, create the Auth account in Supabase; it will appear here automatically and George can manage its normal staff role/status here.')}

const _settingsInitFix2=settingsInit;settingsInit=function(){_settingsInitFix2();setTimeout(loadUserAdmin,50)};
document.addEventListener('DOMContentLoaded',()=>setTimeout(loadLocalAvatar,120));


/* ===== RCM v2 FIX4: secured settings + staff creation + safe legacy import ===== */
function applySettingsSecurity(){
  const admin=isAdminRole(window.__currentUser&&window.__currentUser.role);
  const form=document.getElementById('settingsForm'),locked=document.getElementById('firmLockedPanel'),imp=document.getElementById('legacyImportPanel');
  if(form)form.hidden=!admin;if(locked)locked.hidden=admin;if(imp)imp.hidden=!admin;
}
function openAddUserModal(){const m=document.getElementById('addUserModal');if(m)m.hidden=false}
function closeAddUserModal(){const m=document.getElementById('addUserModal');if(m)m.hidden=true}
async function createStaffUser(){
  const st=document.getElementById('addUserStatus');if(st)st.textContent='Creating secure account…';
  try{
    const r=await window.pywebview.api.create_staff_user(newUserFirst.value,newUserLast.value,newUserEmail.value,newUserPassword.value,newUserRole.value);
    if(!r||!r.ok)throw new Error((r&&r.error)||'Could not create user');
    if(st)st.textContent='User created successfully.';toast('Staff user created');
    newUserFirst.value='';newUserLast.value='';newUserEmail.value='';newUserPassword.value='';newUserRole.value='staff';
    await loadUserAdmin();setTimeout(closeAddUserModal,700);
  }catch(e){if(st)st.textContent=String(e.message||e)}
}
async function previewLegacyImport(){
  const st=document.getElementById('importStatus'),box=document.getElementById('importReport'),btn=document.getElementById('commitImportBtn');
  if(st)st.textContent='Reading legacy database and checking cloud records…';if(box)box.innerHTML='';if(btn)btn.hidden=true;
  const r=await window.pywebview.api.preview_legacy_import();
  if(!r||!r.ok){if(r&&r.cancelled){if(st)st.textContent='';return}if(st)st.textContent=(r&&r.error)||'Preview failed';return}
  if(st)st.textContent=`Preview: ${r.file}. Nothing has been imported yet.`;
  const order=['clients','cases','case_notes','contact_updates','documents','invoices','payments','tasks','settings'];
  const labels={clients:'Clients',cases:'Cases',case_notes:'Case Notes',contact_updates:'Contact Updates',documents:'Documents',invoices:'Invoices',payments:'Payments',tasks:'Tasks',settings:'Settings'};
  if(box)box.innerHTML=`<div class="import-summary"><table><thead><tr><th>Data</th><th>New</th><th>Already There</th><th>Conflicts / Blocked</th></tr></thead><tbody>${order.map(k=>{const x=r.report[k]||{};return `<tr><td>${labels[k]}</td><td>${x.new||0}</td><td>${x.existing||0}</td><td>${(x.conflicts||0)+(x.blocked_parent||0)}</td></tr>`}).join('')}</tbody></table>${r.conflict_count?`<div class="import-warning"><strong>${r.conflict_count} possible duplicate conflict${r.conflict_count===1?'':'s'} blocked.</strong><div class="sub">They will not be overwritten or imported automatically.</div></div>`:'<div class="import-ok">No duplicate conflicts detected.</div>'}</div>`;
  if(btn)btn.hidden=false;
}
async function commitLegacyImport(){
  if(!confirm('Import only the safe NEW records shown in the preview? Existing records and conflicts will NOT be overwritten.'))return;
  const st=document.getElementById('importStatus'),btn=document.getElementById('commitImportBtn');if(btn)btn.disabled=true;if(st)st.textContent='Importing safe records…';
  const r=await window.pywebview.api.commit_legacy_import();if(btn)btn.disabled=false;
  if(!r||!r.ok){if(st)st.textContent=(r&&r.error)||'Import failed';return}
  const total=Object.values(r.imported||{}).reduce((a,b)=>a+(+b||0),0),skipped=Object.values(r.skipped||{}).reduce((a,b)=>a+(+b||0),0);
  if(st)st.textContent=`Import complete: ${total} records added, ${skipped} skipped/protected${r.error_count?`, ${r.error_count} errors`:''}.`;
  toast('Legacy import complete');if(btn)btn.hidden=true;
  if(window.desktopHydrate)await window.desktopHydrate();
}

const _settingsInitFix4=settingsInit;settingsInit=function(){_settingsInitFix4();applySettingsSecurity();setTimeout(loadUserAdmin,50)};


/* ===== RCM v2 FIX7: clean user management + payment edit/delete ===== */
let editingPaymentIdFix7=null;

function fix7PaymentRowButtons(p,caseId){
  return `<button class="btn btn-small btn-secondary" onclick="viewPayment('${p.id}')">View</button><button class="btn btn-small btn-secondary" onclick="savePayment('${p.id}')">Save</button><button class="btn btn-small btn-secondary" onclick="printPayment('${p.id}')">Print</button><button class="btn btn-small btn-secondary" onclick="emailPayment('${p.id}')">Email</button><button class="btn btn-small btn-secondary" onclick="editPaymentFix7('${p.id}','${caseId}')">Edit</button><button class="btn btn-small btn-danger" onclick="deletePaymentFix7('${p.id}','${caseId}')">Delete</button>`;
}

function editPaymentFix7(id,caseId){
  const p=load(S.payments).find(x=>x.id===id);if(!p)return;
  editingPaymentIdFix7=id;
  const form=document.getElementById('paymentForm');
  if(!form){location.href=`case-detail.html?id=${encodeURIComponent(caseId||p.caseId)}&editPayment=${encodeURIComponent(id)}`;return}
  const set=(name,val)=>{const el=form.elements[name];if(el)el.value=val==null?'':val};
  set('amount',p.amount);set('date',p.date);set('method',p.method);set('reference',p.reference);set('note',p.note);set('invoiceId',p.invoiceId||'');
  const btn=form.querySelector('button[type="submit"],button:not([type])');if(btn)btn.textContent='Update Payment';
  form.scrollIntoView({behavior:'smooth',block:'center'});toast('Editing payment');
}

async function deletePaymentFix7(id,caseId){
  const p=load(S.payments).find(x=>x.id===id);if(!p)return;
  if(!confirm(`Delete this ${money(p.amount)} payment?\n\nThis cannot be undone.`))return;
  const rows=load(S.payments).filter(x=>x.id!==id);
  try{await save(S.payments,rows);toast('Payment deleted');
    if(document.getElementById('casePaymentsList'))renderPayments(caseId||p.caseId);
    if(document.getElementById('allPaymentsBody'))renderAllPaymentsTable();
    if(document.getElementById('caseInvoicesList'))renderInvoices(caseId||p.caseId);
  }catch(e){alert('Could not delete payment: '+String(e.message||e))}
}

/* Capture payment-form submits only while editing, leaving normal Add Payment untouched. */
document.addEventListener('submit',async function(e){
  if(!editingPaymentIdFix7||!e.target||e.target.id!=='paymentForm')return;
  e.preventDefault();e.stopImmediatePropagation();
  const form=e.target,f=new FormData(form),rows=load(S.payments),idx=rows.findIndex(x=>x.id===editingPaymentIdFix7);if(idx<0){editingPaymentIdFix7=null;return}
  const amount=+f.get('amount');if(!(amount>0)){alert('Enter a payment amount greater than $0.');return}
  rows[idx]={...rows[idx],amount,date:String(f.get('date')||''),method:String(f.get('method')||''),reference:String(f.get('reference')||''),note:String(f.get('note')||''),invoiceId:String(f.get('invoiceId')||'')};
  const caseId=rows[idx].caseId;
  try{await save(S.payments,rows);editingPaymentIdFix7=null;form.reset();const btn=form.querySelector('button[type="submit"],button:not([type])');if(btn)btn.textContent='Add Payment';renderPayments(caseId);renderInvoices(caseId);toast('Payment updated')}
  catch(err){alert('Could not update payment: '+String(err.message||err))}
},true);

const _renderPaymentsFix7=renderPayments;
renderPayments=function(id){
  _renderPaymentsFix7(id);
  const holder=document.getElementById('casePaymentsList');if(!holder)return;
  const rows=load(S.payments).filter(x=>x.caseId===id).slice().reverse();
  holder.innerHTML=rows.map(p=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${money(p.amount)}</strong><div class="actions">${fix7PaymentRowButtons(p,id)}</div></div><div class="sub">${fmt(p.date)} • ${esc(p.method||'')} ${p.reference?'• Ref '+esc(p.reference):''}</div><div class="body">${esc(p.note||'')}</div></div>`).join('')||'<div class="empty"><strong>No payments.</strong></div>';
};

renderAllPaymentsTable=function(){
  const body=document.getElementById('allPaymentsBody');if(!body)return;
  const cm=Object.fromEntries(load(S.clients).map(c=>[c.id,c])),cases=Object.fromEntries(load(S.cases).map(c=>[c.id,c])),invs=Object.fromEntries(load(S.invoices).map(i=>[i.id,i])),all=load(S.payments).slice().sort((a,b)=>paymentSortValue(b).localeCompare(paymentSortValue(a)));
  const totalPages=Math.max(1,Math.ceil(all.length/PAYMENT_HISTORY_PAGE_SIZE));paymentHistoryPage=Math.max(1,Math.min(paymentHistoryPage,totalPages));const start=(paymentHistoryPage-1)*PAYMENT_HISTORY_PAGE_SIZE,rows=all.slice(start,start+PAYMENT_HISTORY_PAGE_SIZE);
  body.innerHTML=rows.map(p=>`<tr><td>${fmt(p.date)}</td><td><a class="link" href="case-detail.html?id=${p.caseId}">${esc(cname(cm[p.clientId]))}</a></td><td>${esc(cases[p.caseId]?.caseNumber||cases[p.caseId]?.caseType||'')}</td><td>${p.invoiceId&&invs[p.invoiceId]?'#'+esc(invs[p.invoiceId].number):'—'}</td><td>${money(p.amount)}</td><td>${money(paymentBalanceAfter(p))}</td><td>${esc(p.method||'')}</td><td><div class="payment-actions">${fix7PaymentRowButtons(p,p.caseId)}</div></td></tr>`).join('')||'<tr><td colspan="8" class="empty"><strong>No payments recorded.</strong></td></tr>';
  ['paymentHistPageTop','paymentHistPageBottom'].forEach(id=>{const x=document.getElementById(id);if(x)x.textContent=`Page ${paymentHistoryPage} of ${totalPages}`});['paymentHistBackTop','paymentHistBackBottom'].forEach(id=>{const x=document.getElementById(id);if(x)x.disabled=paymentHistoryPage<=1});['paymentHistNextTop','paymentHistNextBottom'].forEach(id=>{const x=document.getElementById(id);if(x)x.disabled=paymentHistoryPage>=totalPages});
};

function userAdminCardFix7(u,caller){
  const locked=u.role==='system_admin'&&caller!=='system_admin',isInactive=u.active===false;
  return `<div class="user-admin-row" data-user-id="${esc(u.id)}"><div class="user-admin-name"><strong>${esc([u.first_name,u.last_name].filter(Boolean).join(' ')||'Unnamed User')}</strong><div class="sub">${esc(u.id)}</div></div><input class="ua-first" value="${esc(u.first_name||'')}" placeholder="First name"><input class="ua-last" value="${esc(u.last_name||'')}" placeholder="Last name"><select class="ua-role" ${locked?'disabled':''}><option value="staff">Staff</option><option value="secretary">Secretary</option><option value="attorney">Attorney</option><option value="paralegal">Paralegal</option><option value="billing">Billing</option><option value="admin">Firm Admin</option>${caller==='system_admin'?'<option value="system_admin">10xLABZ System Admin</option>':''}</select><div class="ua-actions"><button class="btn btn-small btn-secondary" ${locked?'disabled':''} onclick="saveManagedUserFix7(this)">Save</button><button class="btn btn-small ${isInactive?'btn-secondary':'btn-danger'}" ${locked?'disabled':''} onclick="toggleManagedUserFix7(this,${isInactive?'true':'false'})">${isInactive?'Reactivate':'Deactivate'}</button>${caller==='system_admin'&&u.role!=='system_admin'?`<button class="btn btn-small btn-danger" onclick="deleteManagedUserFix7(this)">Delete</button>`:''}</div></div>`;
}

loadUserAdmin=async function(){
  const panel=document.getElementById('userAdminPanel');if(!panel||!isAdminRole(window.__currentUser&&window.__currentUser.role))return;panel.hidden=false;
  const status=document.getElementById('userAdminStatus'),list=document.getElementById('userAdminList');status.textContent='Loading users…';
  try{const r=await window.pywebview.api.list_profiles();if(!r||!r.ok)throw new Error((r&&r.error)||'Could not load users');status.textContent='';const caller=(r.current_user||{}).role||'staff',profiles=r.profiles||[],active=profiles.filter(u=>u.active!==false),inactive=profiles.filter(u=>u.active===false);
    list.innerHTML=`<div class="user-list-title"><strong>Active Users (${active.length})</strong></div><div id="activeUserRows">${active.map(u=>userAdminCardFix7(u,caller)).join('')||'<div class="empty"><strong>No active users.</strong></div>'}</div><details class="inactive-users"><summary>Inactive Users (${inactive.length})</summary><div class="inactive-user-rows">${inactive.map(u=>userAdminCardFix7(u,caller)).join('')||'<div class="empty"><strong>No inactive users.</strong></div>'}</div></details>`;
    profiles.forEach(u=>{const row=list.querySelector(`[data-user-id="${u.id}"]`);if(row){const s=row.querySelector('.ua-role');if(s)s.value=u.role||'staff'}});
  }catch(e){status.textContent=String(e.message||e)}
};

async function saveManagedUserFix7(btn,activeOverride){
  const row=btn.closest('.user-admin-row'),id=row.dataset.userId,r=await window.pywebview.api.update_profile_admin(id,row.querySelector('.ua-first').value,row.querySelector('.ua-last').value,row.querySelector('.ua-role').value,activeOverride===undefined?true:activeOverride);
  if(!r||!r.ok){alert((r&&r.error)||'Could not update user');return false}toast('User updated');return true;
}
async function toggleManagedUserFix7(btn,currentlyInactive){if(await saveManagedUserFix7(btn,currentlyInactive)){await loadUserAdmin()}}
async function deleteManagedUserFix7(btn){
  const row=btn.closest('.user-admin-row'),name=row.querySelector('.user-admin-name strong')?.textContent||'this user';if(!confirm(`Permanently delete ${name}?\n\nUse Deactivate for former employees when you want to preserve the account history. Permanent delete cannot be undone.`))return;
  const r=await window.pywebview.api.delete_user_admin(row.dataset.userId);if(!r||!r.ok){alert((r&&r.error)||'Could not delete user');return}toast('User deleted');await loadUserAdmin();
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{const id=qs('editPayment');if(id)editPaymentFix7(id,qs('id'))},500));


/* ===== RCM v2 FIX9: historical Court Dates + Appointments + Opposing Counsel ===== */
function applicableOpposingCounsel(caseType){
  const x=String(caseType||'').toLowerCase();
  return x.includes('civil')||x.includes('injury')||x.includes('family')||x.includes('other');
}
function refreshOpposingCounselVisibility(cs){
  const box=document.getElementById('opposingCounselGroup');if(box)box.hidden=!applicableOpposingCounsel(cs&&cs.caseType);
}
async function migrateLegacyDatesFix8(cs){
  let changed=false;
  if(cs.nextCourtDate&&!load(S.courtDates).some(x=>x.caseId===cs.id)){
    const rows=load(S.courtDates);rows.push({id:uid('court'),caseId:cs.id,clientId:cs.clientId,date:cs.nextCourtDate,time:'',type:'',note:cs.nextCourtDateNote||'',done:false,completionNote:'',createdAt:now(),completedAt:null});await save(S.courtDates,rows);changed=true;
  }
  if(cs.nextLegalDate&&!load(S.legalDates).some(x=>x.caseId===cs.id)){
    const rows=load(S.legalDates);rows.push({id:uid('legal'),caseId:cs.id,clientId:cs.clientId,date:cs.nextLegalDate,time:'',type:'',note:cs.nextLegalDateNote||'',done:false,completionNote:'',createdAt:now(),completedAt:null});await save(S.legalDates,rows);changed=true;
  }
  return changed;
}
function renderCourtDatesFix8(caseId){
  const box=document.getElementById('caseCourtDatesList');if(!box)return;
  const rows=load(S.courtDates).filter(x=>x.caseId===caseId).slice().sort((a,b)=>(a.done-b.done)||String(a.date).localeCompare(String(b.date)));
  box.innerHTML=rows.map(x=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${fmt(x.date)}${x.time?' • '+esc(x.time):''}</strong><div><button class="btn btn-small ${x.done?'btn-secondary':'btn-primary'}" onclick="completeCourtDateFix8('${x.id}')">${x.done?'Completed':'Complete'}</button> <button class="btn btn-small btn-danger" onclick="deleteDateFix8('court','${x.id}','${caseId}')">Delete</button></div></div><div class="sub">${esc(x.type||'Court Date')}</div>${x.note?`<div class="body">${esc(x.note)}</div>`:''}${x.done?`<div class="body"><strong>Result / Completion Notes:</strong> ${esc(x.completionNote||'Completed')}</div>`:''}</div>`).join('')||'<div class="empty"><strong>No court dates recorded.</strong></div>';
}
function renderLegalDatesFix8(caseId){
  const box=document.getElementById('caseLegalDatesList');if(!box)return;
  const rows=load(S.legalDates).filter(x=>x.caseId===caseId).slice().sort((a,b)=>(a.done-b.done)||String(a.date).localeCompare(String(b.date)));
  box.innerHTML=rows.map(x=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${fmt(x.date)}${x.time?' • '+esc(fmtTime(x.time)):''}</strong><div><button class="btn btn-small ${x.done?'btn-secondary':'btn-primary'}" onclick="completeLegalDateFix8('${x.id}')">${x.done?'Completed':'Complete'}</button> <button class="btn btn-small btn-danger" onclick="deleteDateFix8('legal','${x.id}','${caseId}')">Delete</button></div></div><div class="sub">${esc(x.type||'Appointment')}</div>${x.note?`<div class="body">${esc(x.note)}</div>`:''}${x.done?`<div class="body"><strong>Result / Completion Notes:</strong> ${esc(x.completionNote||'Completed')}</div>`:''}</div>`).join('')||'<div class="empty"><strong>No appointments recorded.</strong></div>';
}
async function completeCourtDateFix8(id){const rows=load(S.courtDates),x=rows.find(r=>r.id===id);if(!x)return;if(x.done){if(!confirm('Mark this court date active again?'))return;x.done=false;x.completedAt=null;x.completionNote=''}else{const n=prompt('Court date result / completion notes:','');if(n===null)return;x.done=true;x.completedAt=now();x.completionNote=n.trim()}await save(S.courtDates,rows);renderCourtDatesFix8(x.caseId);toast(x.done?'Court date completed':'Court date reactivated')}
async function completeLegalDateFix8(id){const rows=load(S.legalDates),x=rows.find(r=>r.id===id);if(!x)return;if(x.done){if(!confirm('Mark this appointment active again?'))return;x.done=false;x.completedAt=null;x.completionNote=''}else{const n=prompt('Appointment result / completion notes:','');if(n===null)return;x.done=true;x.completedAt=now();x.completionNote=n.trim()}await save(S.legalDates,rows);renderLegalDatesFix8(x.caseId);toast(x.done?'Appointment completed':'Appointment reactivated')}
async function deleteDateFix8(kind,id,caseId){if(!confirm('Delete this date from the case history?'))return;const key=kind==='court'?S.courtDates:S.legalDates;await save(key,load(key).filter(x=>x.id!==id));kind==='court'?renderCourtDatesFix8(caseId):renderLegalDatesFix8(caseId)}
function renderOpposingCounselFix8(caseId){
  const box=document.getElementById('opposingCounselList');if(!box)return;const rows=load(S.opposing).filter(x=>x.caseId===caseId).slice().reverse();
  box.innerHTML=rows.map(x=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(x.attorneyName||'Opposing Counsel')}</strong><button class="btn btn-small btn-danger" onclick="deleteOpposingCounselFix8('${x.id}','${caseId}')">Delete</button></div><div class="sub">${esc(x.firm||'')}${x.phone?' • '+esc(x.phone):''}${x.email?' • '+esc(x.email):''}</div>${x.address?`<div class="body">${esc(x.address)}</div>`:''}${x.note?`<div class="body">${esc(x.note)}</div>`:''}</div>`).join('')||'<div class="empty"><strong>No opposing counsel recorded.</strong></div>';
}
async function deleteOpposingCounselFix8(id,caseId){if(!confirm('Delete this opposing counsel entry?'))return;await save(S.opposing,load(S.opposing).filter(x=>x.id!==id));renderOpposingCounselFix8(caseId)}

const _caseDetailInitFix8=caseDetailInit;
caseDetailInit=function(){
  _caseDetailInitFix8();
  const id=qs('id'),cs=getCase(id);if(!cs)return;
  refreshOpposingCounselVisibility(cs);
  migrateLegacyDatesFix8(cs).then(()=>{renderCourtDatesFix8(id);renderLegalDatesFix8(id)}).catch(e=>console.warn('Legacy date migration:',e));
  renderCourtDatesFix8(id);renderLegalDatesFix8(id);renderOpposingCounselFix8(id);
  const cf=document.getElementById('courtDateForm');if(cf)cf.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(cf),date=String(f.get('date')||'').trim(),time=String(f.get('time')||'').trim();if(!date){alert('Date is required.');return}if(!time){alert('Time is required.');return}const rows=load(S.courtDates);rows.push({id:uid('court'),caseId:id,clientId:cs.clientId,date,time,type:String(f.get('type')||''),note:String(f.get('note')||''),done:false,completionNote:'',createdAt:now(),completedAt:null});await save(S.courtDates,rows);cf.reset();renderCourtDatesFix8(id);toast('Court date added')});
  const lf=document.getElementById('legalDateForm');if(lf)lf.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(lf),date=String(f.get('date')||'').trim(),time=String(f.get('time')||'').trim();if(!date){alert('Date is required.');return}if(!time){alert('Time is required.');return}const rows=load(S.legalDates);rows.push({id:uid('legal'),caseId:id,clientId:cs.clientId,date,time,type:String(f.get('type')||''),note:String(f.get('note')||''),done:false,completionNote:'',createdAt:now(),completedAt:null});await save(S.legalDates,rows);lf.reset();renderLegalDatesFix8(id);toast('Appointment added')});
  const of=document.getElementById('opposingCounselForm');if(of)of.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(of),rows=load(S.opposing);rows.push({id:uid('opp'),caseId:id,clientId:cs.clientId,attorneyName:String(f.get('attorneyName')||''),firm:String(f.get('firm')||''),phone:String(f.get('phone')||''),email:String(f.get('email')||''),address:String(f.get('address')||''),note:String(f.get('note')||''),createdAt:now(),updatedAt:now()});await save(S.opposing,rows);of.reset();renderOpposingCounselFix8(id);toast('Opposing counsel added')});
  const caseType=document.getElementById('caseType');if(caseType)caseType.addEventListener('change',()=>{cs.caseType=caseType.value;refreshOpposingCounselVisibility(cs)});
};


/* ===== RCM v2 FIX11: multi-user client edit lock ===== */
let clientEditLockFix11={clientId:null,held:false,owner:'',heartbeat:null,retry:null,releasing:false,idleTimer:null,lastActivity:Date.now(),idleReleased:false};
const CLIENT_IDLE_TIMEOUT_FIX13=15*60*1000;
function markClientActivityFix13(){
  if(!clientEditLockFix11.clientId||clientEditLockFix11.idleReleased)return;
  clientEditLockFix11.lastActivity=Date.now();
}
['pointerdown','keydown','input','change','wheel','touchstart'].forEach(ev=>document.addEventListener(ev,markClientActivityFix13,{capture:true,passive:true}));
function startClientIdleTimerFix13(){
  clientEditLockFix11.lastActivity=Date.now();clientEditLockFix11.idleReleased=false;
  clearInterval(clientEditLockFix11.idleTimer);
  clientEditLockFix11.idleTimer=setInterval(async()=>{
    if(!clientEditLockFix11.held||clientEditLockFix11.releasing)return;
    if(Date.now()-clientEditLockFix11.lastActivity<CLIENT_IDLE_TIMEOUT_FIX13)return;
    const id=clientEditLockFix11.clientId;
    clearInterval(clientEditLockFix11.heartbeat);clearInterval(clientEditLockFix11.idleTimer);
    clientEditLockFix11.releasing=true;
    try{await window.pywebview.api.release_client_lock(id)}catch(e){}
    clientEditLockFix11.held=false;clientEditLockFix11.releasing=false;clientEditLockFix11.idleReleased=true;
    setClientReadOnlyFix11(true);
    showClientLockBannerFix11(true,'','Editing access was released after 15 minutes of inactivity. Click RESUME EDITING to refresh the latest client data and request editing access again.');
    const r=document.getElementById('clientEditLockRetry');if(r)r.textContent='RESUME EDITING';
  },5000);
}
function clientIdForCurrentPageFix11(){
  const p=document.body.dataset.page;
  if(p==='client-profile')return qs('id');
  if(p==='case-detail'){const cs=getCase(qs('id'));return cs&&cs.clientId||null}
  return null;
}
function showClientLockBannerFix11(readOnly,owner,message){
  const b=document.getElementById('clientEditLockBanner'),t=document.getElementById('clientEditLockTitle'),x=document.getElementById('clientEditLockText'),r=document.getElementById('clientEditLockRetry');
  if(!b)return;b.hidden=false;
  if(readOnly){t.textContent='READ-ONLY — CLIENT CURRENTLY IN USE';x.textContent=message||(`Currently being edited by ${owner||'another user'}. You can view this client, but editing is temporarily disabled.`);if(r)r.hidden=false}
  else{t.textContent='EDITING CLIENT';x.textContent='You currently have editing access to this client.';if(r)r.hidden=true;setTimeout(()=>{if(clientEditLockFix11.held)b.hidden=true},1800)}
}
function setClientReadOnlyFix11(readOnly){
  const content=document.querySelector('.content');if(!content)return;
  content.querySelectorAll('form input, form textarea, form select, form button').forEach(el=>{el.disabled=readOnly});
  const mutators=['toggleTask(','delItem(','deletePaymentFix7(','editPaymentFix7(','deleteInvoice(','editInvoice(','completeCourtDateFix8(','completeLegalDateFix8(','deleteDateFix8(','deleteOpposingCounselFix8(','addAgreedFeeToInvoice(','deleteManagedUserFix7(','saveManagedUser('];
  content.querySelectorAll('button[onclick]').forEach(b=>{const h=b.getAttribute('onclick')||'';if(mutators.some(m=>h.includes(m)))b.disabled=readOnly});
  content.querySelectorAll('a[href*="add-case.html"]').forEach(a=>a.classList.toggle('rcm-lock-disabled',readOnly));
  // Client Profile has + Add Case buttons implemented as buttons, not links.
  if(document.body.dataset.page==='client-profile')content.querySelectorAll('button[onclick*="add-case.html"]').forEach(b=>b.disabled=readOnly);
}
async function acquireClientEditLockFix11(){
  const id=clientIdForCurrentPageFix11();if(!id||!(window.pywebview&&window.pywebview.api&&window.pywebview.api.acquire_client_lock))return;
  clientEditLockFix11.clientId=id;
  try{
    const r=await window.pywebview.api.acquire_client_lock(id);
    if(r&&r.ok&&r.acquired){
      clientEditLockFix11.held=true;clientEditLockFix11.owner='';setClientReadOnlyFix11(false);showClientLockBannerFix11(false);startClientIdleTimerFix13();const rb=document.getElementById('clientEditLockRetry');if(rb)rb.textContent='CHECK AGAIN';
      clearInterval(clientEditLockFix11.heartbeat);clientEditLockFix11.heartbeat=setInterval(async()=>{try{const h=await window.pywebview.api.heartbeat_client_lock(id);if(!h||!h.ok||!h.held){clientEditLockFix11.held=false;setClientReadOnlyFix11(true);showClientLockBannerFix11(true,'','Editing lock was lost. Click CHECK AGAIN before making changes.')}}catch(e){}},30000);
    }else{
      clientEditLockFix11.held=false;clientEditLockFix11.owner=(r&&r.owner_name)||'another user';setClientReadOnlyFix11(true);showClientLockBannerFix11(true,clientEditLockFix11.owner);
    }
  }catch(e){clientEditLockFix11.held=false;setClientReadOnlyFix11(true);showClientLockBannerFix11(true,'','Could not verify editing access. This client is read-only until the lock service reconnects.')}
}
async function retryClientEditLockFix11(){
  // Always refresh from Supabase before a previously-idle/stale screen is allowed to edit again.
  if(window.desktopHydrate)await window.desktopHydrate();
  await acquireClientEditLockFix11();
  if(clientEditLockFix11.held)location.reload();
}
async function releaseClientEditLockFix11(){
  if(clientEditLockFix11.releasing||!clientEditLockFix11.held||!clientEditLockFix11.clientId)return;
  clientEditLockFix11.releasing=true;clearInterval(clientEditLockFix11.heartbeat);clearInterval(clientEditLockFix11.idleTimer);
  try{await window.pywebview.api.release_client_lock(clientEditLockFix11.clientId)}catch(e){}
  clientEditLockFix11.held=false;clientEditLockFix11.releasing=false;
}
// Release before normal internal navigation so the next user does not wait for expiration.
document.addEventListener('click',async e=>{
  if(!clientEditLockFix11.held)return;
  const a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
  const href=a.getAttribute('href')||'';if(!href||href.startsWith('mailto:')||href.startsWith('tel:')||a.target==='_blank')return;
  e.preventDefault();await releaseClientEditLockFix11();location.href=href;
},true);
window.addEventListener('beforeunload',()=>{if(clientEditLockFix11.held&&window.pywebview&&window.pywebview.api)window.pywebview.api.release_client_lock(clientEditLockFix11.clientId).catch(()=>{})});

const _caseDetailInitFix11=caseDetailInit;
caseDetailInit=async function(){await _caseDetailInitFix11();await acquireClientEditLockFix11()};
const _clientProfileInitFix11=clientProfileInit;
clientProfileInit=async function(){await _clientProfileInitFix11();await acquireClientEditLockFix11()};


/* ===== FIX12 FINAL DOCUMENT / CASE ACTIONS ===== */
function invoiceStandaloneHTMLFix12(id){
  const i=load(S.invoices).find(x=>x.id===id);if(!i)return'';
  const body=buildInvoiceHTML(id);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(i.number)}</title><style>
  *{box-sizing:border-box}body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#17293e}.sheet{width:100%;background:#fff}
  .ip-head{background:#0b2948;color:#fff;padding:30px 34px;display:flex;justify-content:space-between;gap:30px;border-bottom:5px solid #d2a44b}.ip-brand{font-family:Georgia,serif;font-size:27px;font-weight:bold}.ip-contact{text-align:right;color:#f2dfae;font-size:12px;line-height:1.6}.ip-body{padding:30px 34px}.ip-title{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}.ip-title h1{margin:0;font:700 36px Georgia,serif;color:#0b2948}.ip-number{text-align:right;color:#667382;font-size:13px;line-height:1.6}.ip-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:20px 0 26px}.ip-box{border:1px solid #dfe3e7;border-radius:7px;overflow:hidden}.ip-box h3{margin:0;padding:9px 12px;background:#f4ead3;color:#6b4b13;font-size:11px;text-transform:uppercase;letter-spacing:.7px}.ip-box div{padding:12px;font-size:13px;line-height:1.55}.ip-table{width:100%;border-collapse:collapse;margin-top:18px}.ip-table th{background:#0b2948;color:#fff;padding:11px 12px;text-align:left;font-size:12px}.ip-table td{padding:15px 12px;border-bottom:1px solid #e0e3e6}.ip-amount{text-align:right;font-weight:bold}.ip-total{margin:22px 0 0 auto;width:320px;border-top:3px solid #d2a44b;padding-top:12px;display:flex;justify-content:space-between;font:700 22px Georgia,serif}.ip-note{margin-top:28px;background:#f8f6f1;border-left:4px solid #d2a44b;padding:14px 16px;font-size:13px;line-height:1.55}.ip-status{display:inline-block;padding:5px 10px;border-radius:999px;background:#f4ead3;color:#725115;font-weight:bold;font-size:11px}.ip-footer{margin-top:34px;background:#081f35;color:#e9d39e;text-align:center;padding:15px 20px;font-size:11px;line-height:1.55}@page{size:Letter;margin:.35in}</style></head><body><div class="sheet">${body}</div></body></html>`;
}
async function saveInvoiceFix12(id){
  const i=load(S.invoices).find(x=>x.id===id);if(!i)return;
  if(!window.desktopSavePdfFile){alert('Desktop PDF Save is unavailable.');return}
  const r=await window.desktopSavePdfFile(`Invoice_${i.number}.pdf`,invoiceStandaloneHTMLFix12(id));
  if(r&&r.ok)toast('Invoice PDF saved');else if(r&&r.error)alert('Could not save invoice PDF: '+r.error)
}
saveInvoice=saveInvoiceFix12;

function paymentStandaloneHTMLFix12(id){
  const p=load(S.payments).find(x=>x.id===id);if(!p)return'';const body=buildPaymentHTML(id);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt</title><style>
  *{box-sizing:border-box}body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#17293e}.sheet{width:100%;background:#fff}.r-head{background:#0b2948;color:#fff;padding:30px 34px;display:flex;justify-content:space-between;gap:30px;border-bottom:5px solid #d2a44b}.r-brand{font-family:Georgia,serif;font-size:27px;font-weight:bold}.r-contact{text-align:right;color:#f2dfae;font-size:12px;line-height:1.6}.r-body{padding:30px 34px}.r-title{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}.r-title h1{margin:0;font:700 34px Georgia,serif;color:#0b2948}.r-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:20px 0 26px}.r-box{border:1px solid #dfe3e7;border-radius:7px;overflow:hidden}.r-box h3{margin:0;padding:9px 12px;background:#f4ead3;color:#6b4b13;font-size:11px;text-transform:uppercase;letter-spacing:.7px}.r-box div{padding:12px;font-size:13px;line-height:1.6}.r-amount{margin:25px 0 0 auto;width:360px;border-top:3px solid #d2a44b;padding-top:14px}.r-row{display:flex;justify-content:space-between;font-size:16px;padding:5px 0}.r-row.big{font:700 22px Georgia,serif;color:#0b2948}.r-note{margin-top:25px;background:#f8f6f1;border-left:4px solid #d2a44b;padding:14px 16px;font-size:13px}.r-footer{margin-top:34px;background:#081f35;color:#e9d39e;text-align:center;padding:15px 20px;font-size:11px;line-height:1.55}@page{size:Letter;margin:.35in}</style></head><body><div class="sheet">${body}</div></body></html>`;
}
async function savePaymentFix12(id){
  const p=load(S.payments).find(x=>x.id===id);if(!p)return;
  const date=String(p.date||'').replace(/-/g,'')||'Receipt';
  if(!window.desktopSavePdfFile){alert('Desktop PDF Save is unavailable.');return}
  const r=await window.desktopSavePdfFile(`Payment_Receipt_${date}.pdf`,paymentStandaloneHTMLFix12(id));
  if(r&&r.ok)toast('Payment receipt PDF saved');else if(r&&r.error)alert('Could not save receipt PDF: '+r.error)
}
savePayment=savePaymentFix12;

function viewCaseReportFix12(){const id=qs('id');if(id)location.href=`case-report-preview.html?id=${encodeURIComponent(id)}`}
function printCaseReportFix12(){const id=qs('id');if(id)location.href=`case-report-preview.html?id=${encodeURIComponent(id)}&print=1`}
function caseReportEmailFix12(){
  const id=qs('id'),cs=getCase(id);if(!cs)return;const c=getClient(cs.clientId)||{};
  const subject=`Case Report - ${cname(c)}${cs.caseNumber?' - '+cs.caseNumber:''}`;
  const body=`Rodriguez Law Firm, LLC\n\nAttached is the case report for ${cname(c)}.\nCase: ${[cs.caseType,cs.subCaseType].filter(Boolean).join(' - ')}\nCase #: ${cs.caseNumber||''}\n\nPlease attach the saved PDF case report to this email.\n\nRodriguez Law Firm, LLC\n(203) 630-0406`;
  location.href=`mailto:${encodeURIComponent(c.email||'')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
async function caseReportStandaloneHTMLFix12(id){
  return await new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');frame.style.position='fixed';frame.style.left='-10000px';frame.style.width='900px';frame.style.height='1200px';frame.src=`case-report-preview.html?id=${encodeURIComponent(id)}`;document.body.appendChild(frame);
    const timer=setTimeout(()=>{try{frame.remove()}catch(e){}reject(new Error('Case report preview timed out.'))},7000);
    frame.onload=()=>setTimeout(()=>{try{
      const doc=frame.contentDocument,holder=doc&&doc.getElementById('caseReportPreview');if(!holder)throw new Error('Case report could not be generated.');
      const html=`<!doctype html><html><head><meta charset="utf-8"><title>Case Report</title><style>*{box-sizing:border-box}body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#17293e}.report{width:100%;background:#fff}h1,h2,h3{break-after:avoid;page-break-after:avoid}@page{size:Letter;margin:.35in}</style></head><body><div class="report">${holder.innerHTML}</div></body></html>`;
      clearTimeout(timer);frame.remove();resolve(html);
    }catch(e){clearTimeout(timer);frame.remove();reject(e)}},900);
  });
}
async function saveCaseReportFix12(){
  const id=qs('id'),cs=getCase(id);if(!id||!cs)return;const c=getClient(cs.clientId)||{};
  try{const html=await caseReportStandaloneHTMLFix12(id);const safe=(cname(c)||'Client').replace(/[^A-Za-z0-9_-]+/g,'_');const r=await window.desktopSavePdfFile(`Case_Report_${safe}.pdf`,html);if(r&&r.ok)toast('Case report PDF saved');else if(r&&r.error)alert('Could not save case report PDF: '+r.error)}catch(e){alert(String(e.message||e))}
}
async function deleteCaseFix12(){
  const id=qs('id'),cs=getCase(id);if(!cs)return;const c=getClient(cs.clientId)||{};
  if(!confirm(`PERMANENTLY DELETE this case for ${cname(c)}?\n\nThis will also delete this case's notes, tasks, payments, invoices, document links, court dates, appointments, and opposing counsel entries. The client record itself will remain.\n\nThis cannot be undone.`))return;
  try{
    const linked={};linked[S.notes]=x=>x.caseId===id;linked[S.tasks]=x=>x.caseId===id;linked[S.payments]=x=>x.caseId===id;linked[S.invoices]=x=>x.caseId===id;linked[S.docs]=x=>x.caseId===id;linked[S.courtDates]=x=>x.caseId===id;linked[S.legalDates]=x=>x.caseId===id;linked[S.opposing]=x=>x.caseId===id;
    for(const [key,pred] of Object.entries(linked))await save(key,load(key).filter(x=>!pred(x)));
    await save(S.cases,load(S.cases).filter(x=>x.id!==id));toast('Case deleted');setTimeout(()=>location.href=`client-profile.html?id=${encodeURIComponent(cs.clientId)}`,500)
  }catch(e){alert('Could not delete case: '+String(e.message||e))}
}

function installCaseReportActionsFix12(){
  if(document.body.dataset.page!=='case-detail')return;const actions=document.querySelector('.page-head .actions');if(!actions)return;
  const old=[...actions.querySelectorAll('button')].find(b=>/print case report/i.test(b.textContent||''));if(old)old.remove();
  if(actions.querySelector('.case-report-actions-fix12'))return;
  const wrap=document.createElement('div');wrap.className='case-report-actions-fix12';wrap.innerHTML=`<button class="btn btn-small btn-secondary" type="button" onclick="viewCaseReportFix12()">View</button><button class="btn btn-small btn-secondary" type="button" onclick="saveCaseReportFix12()">Save</button><button class="btn btn-small btn-secondary" type="button" onclick="printCaseReportFix12()">Print</button><button class="btn btn-small btn-secondary" type="button" onclick="caseReportEmailFix12()">Email</button><button class="btn btn-small btn-danger" type="button" onclick="deleteCaseFix12()">Delete</button>`;actions.appendChild(wrap)
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(installCaseReportActionsFix12,250));

/* ===== RCM Web Mobile Navigation v1 ===== */
(function(){
  function closeMobileNav(){ document.body.classList.remove('mobile-nav-open'); }
  function initMobileNav(){
    const topbar=document.querySelector('.topbar');
    const sidebar=document.querySelector('.sidebar');
    if(!topbar||!sidebar||document.querySelector('.mobile-menu-btn')) return;

    const button=document.createElement('button');
    button.type='button';
    button.className='mobile-menu-btn';
    button.setAttribute('aria-label','Open navigation');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='☰';
    topbar.insertBefore(button,topbar.firstChild);

    const brandMark=document.createElement('a');
    brandMark.className='mobile-brand-mark';
    brandMark.href='index.html';
    brandMark.setAttribute('aria-label','Dashboard');
    brandMark.innerHTML='<img src="icon1.png" alt="Rodriguez Law Firm">';
    topbar.insertBefore(brandMark,topbar.firstChild);

    const overlay=document.createElement('div');
    overlay.className='mobile-nav-overlay';
    overlay.setAttribute('aria-hidden','true');
    document.body.appendChild(overlay);

    const page=document.body.dataset.page||'';
    const bottom=document.createElement('nav');
    bottom.className='mobile-bottom-nav';
    bottom.setAttribute('aria-label','Mobile primary navigation');
    const items=[
      ['dashboard','index.html','⌂','Dashboard'],
      ['clients','clients.html','♙','Clients'],
      ['new','add-client.html','＋','New Client'],
      ['cases','cases.html','▣','Cases'],
      ['calendar','calendar.html','▦','Calendar']
    ];
    bottom.innerHTML=items.map(([key,href,icon,label])=>`<a href="${href}" class="${page===key?'active ':''}${key==='new'?'mobile-new-client':''}"><span class="mbn-icon">${icon}</span><span>${label}</span></a>`).join('');
    document.body.appendChild(bottom);

    button.addEventListener('click',()=>{
      const open=document.body.classList.toggle('mobile-nav-open');
      button.setAttribute('aria-expanded',open?'true':'false');
    });
    overlay.addEventListener('click',closeMobileNav);
    sidebar.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMobileNav));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileNav()});
    window.addEventListener('resize',()=>{if(window.innerWidth>720)closeMobileNav()});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initMobileNav);
  else initMobileNav();
})();


/* ===== Web cloud-document links + explicit logout ===== */
async function attachDoc(cs,c){
  const f=new FormData(docForm), title=String(f.get('title')||'').trim();
  if(!title){alert('Enter a Document Title first.');return}
  const sourceType=String(f.get('sourceType')||'Other Link').trim();
  let cloudUrl=String(f.get('cloudUrl')||'').trim();
  if(!cloudUrl){alert('Paste the Google Drive, OneDrive, Dropbox, or other document link.');return}
  if(!/^https?:\/\//i.test(cloudUrl)) cloudUrl='https://'+cloudUrl;
  try{new URL(cloudUrl)}catch(_){alert('Enter a valid document link.');return}
  const rows=load(S.docs);
  rows.push({id:uid('doc'),caseId:cs.id,clientId:cs.clientId,clientName:cname(c),title,
    type:String(f.get('type')||''),note:String(f.get('note')||''),sourceType,cloudUrl,
    fileName:sourceType,createdAt:now()});
  save(S.docs,rows);docForm.reset();renderDocs(cs.id);toast('Document link saved');
}
async function openDoc(id){
  const d=load(S.docs).find(x=>x.id===id);if(!d)return;
  if(d.cloudUrl){window.open(d.cloudUrl,'_blank','noopener');return}
  alert('This older document does not have a cloud link. Re-link it using Google Drive, OneDrive, Dropbox, or Other Link.');
}
function renderDocs(id){
  const rows=load(S.docs).filter(x=>x.caseId===id).slice().reverse();
  caseDocumentsList.innerHTML=rows.map(d=>`<div class="timeline-item"><div class="actions" style="justify-content:space-between"><strong>${esc(d.title)}</strong><div><button class="btn btn-small btn-secondary" onclick="openDoc('${d.id}')">Open</button> <button class="btn btn-small btn-danger" onclick="delItem('${S.docs}','${d.id}',()=>renderDocs('${id}'))">Delete</button></div></div><div class="sub">${esc(d.type||'Document')} • ${esc(d.sourceType||d.fileName||'Cloud Link')}</div><div class="body">${esc(d.note||'')}</div></div>`).join('')||'<div class="empty"><strong>No documents.</strong></div>';
}
function docsInit(){
  let rows=load(S.docs).slice().reverse(),pg=paginateRows(rows,listPages.documents,STANDARD_PAGE_SIZE);listPages.documents=pg.page;setPagers('documents',pg.page,pg.totalPages,pg.total);
  documentsBody.innerHTML=pg.rows.map(d=>`<tr><td><button class="btn btn-small btn-secondary" onclick="openDoc('${d.id}')">Open</button></td><td>${esc(d.clientName)}</td><td><a class="link" href="case-detail.html?id=${d.caseId}">${esc(d.title)}</a></td><td>${esc(d.type||'—')}</td><td>${esc(d.sourceType||d.fileName||'Cloud Link')}</td><td>${new Date(d.createdAt).toLocaleDateString()}</td></tr>`).join('')||'<tr><td colspan="6" class="empty"><strong>No documents.</strong></td></tr>';
}
async function logoutRCM(){
  if(!confirm('Log out of Rodriguez Case Manager?'))return;
  try{if(typeof releaseClientEditLockFix11==='function')await releaseClientEditLockFix11()}catch(_){}
  if(window.desktopSignOut)await window.desktopSignOut();else location.replace('login.html');
}

/* ===== Google Drive OAuth + Picker / Upload (RCM web) ===== */
const RCM_GOOGLE_CLIENT_ID='844502220638-copt0dm80ijhafpqv9irjca0o8an2guh.apps.googleusercontent.com';
const RCM_GOOGLE_APP_ID='844502220638';
/* Google Picker requires a browser API key. Set this after creating/restricting the key in Google Cloud. */
const RCM_GOOGLE_API_KEY='AIzaSyC64QIWPTo1o58hbFNQnkvwMfZE4QZfG7k';
const RCM_GOOGLE_SCOPE='https://www.googleapis.com/auth/drive.file';
let rcmGoogleTokenClient=null, rcmGoogleAccessToken=sessionStorage.getItem('rcm_google_drive_token')||'', rcmPickerReady=false;

function updateGoogleDriveUI(){
  const text=document.getElementById('driveConnectionText'), btn=document.getElementById('driveConnectBtn'), disconnectBtn=document.getElementById('driveDisconnectBtn'), card=document.getElementById('driveConnectCard');
  if(!text||!btn)return;
  if(rcmGoogleAccessToken){text.textContent='Connected';btn.textContent='RECONNECT';if(disconnectBtn)disconnectBtn.hidden=false;card&&card.classList.add('drive-connected')}
  else{text.textContent='Not connected';btn.textContent='CONNECT GOOGLE DRIVE';if(disconnectBtn)disconnectBtn.hidden=true;card&&card.classList.remove('drive-connected')}
}
function loadGoogleScript(src,id){
  return new Promise((resolve,reject)=>{
    if(document.getElementById(id)){
      const t=setInterval(()=>{
        if((id==='rcm-google-gis'&&window.google?.accounts?.oauth2)||(id==='rcm-google-api'&&window.gapi)){clearInterval(t);resolve()}
      },100);
      setTimeout(()=>{clearInterval(t);reject(new Error('Google library did not finish loading.'))},10000);
      return;
    }
    const s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load Google library.'));document.head.appendChild(s);
  });
}
async function initGoogleDriveIntegration(){
  if(!window.google?.accounts?.oauth2)await loadGoogleScript('https://accounts.google.com/gsi/client','rcm-google-gis');
  if(!window.gapi)await loadGoogleScript('https://apis.google.com/js/api.js','rcm-google-api');
  if(!rcmGoogleTokenClient)rcmGoogleTokenClient=google.accounts.oauth2.initTokenClient({client_id:RCM_GOOGLE_CLIENT_ID,scope:RCM_GOOGLE_SCOPE,callback:()=>{}});
  if(!rcmPickerReady)await new Promise((resolve,reject)=>{try{gapi.load('picker',{callback:()=>{rcmPickerReady=true;resolve()},onerror:()=>reject(new Error('Google Drive Picker could not load.'))})}catch(e){reject(e)}});
  updateGoogleDriveUI();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initGoogleDriveIntegration().catch(()=>{});updateGoogleDriveUI()});else{initGoogleDriveIntegration().catch(()=>{});updateGoogleDriveUI()}

async function googleDriveToken(promptMode){
  await initGoogleDriveIntegration();
  if(!rcmGoogleTokenClient)throw new Error('Google sign-in could not initialize.');
  return new Promise((resolve,reject)=>{
    rcmGoogleTokenClient.callback=(resp)=>{
      if(resp.error){reject(new Error(resp.error));return}
      rcmGoogleAccessToken=resp.access_token||'';
      if(rcmGoogleAccessToken)sessionStorage.setItem('rcm_google_drive_token',rcmGoogleAccessToken);
      updateGoogleDriveUI();resolve(rcmGoogleAccessToken);
    };
    rcmGoogleTokenClient.requestAccessToken({prompt:promptMode??(rcmGoogleAccessToken?'':'consent')});
  });
}
async function connectGoogleDrive(){
  try{await googleDriveToken('consent');toast('Google Drive connected')}catch(e){alert('Google Drive connection failed: '+e.message)}
}
async function disconnectGoogleDrive(){
  const token=rcmGoogleAccessToken;
  rcmGoogleAccessToken='';
  sessionStorage.removeItem('rcm_google_drive_token');
  updateGoogleDriveUI();
  if(token&&window.google?.accounts?.oauth2?.revoke){
    try{await new Promise(resolve=>google.accounts.oauth2.revoke(token,()=>resolve()))}catch(_){}
  }
  toast('Google Drive disconnected');
}
async function ensureGoogleDriveConnected(){if(rcmGoogleAccessToken)return rcmGoogleAccessToken;return googleDriveToken('consent')}
function currentCaseForDrive(){const id=new URLSearchParams(location.search).get('id');const cs=load(S.cases).find(x=>x.id===id);const c=cs?load(S.clients).find(x=>x.id===cs.clientId):null;return{cs,c}}
function driveFormValues(){const f=new FormData(document.getElementById('docForm'));return{title:String(f.get('title')||'').trim(),type:String(f.get('type')||''),note:String(f.get('note')||'')}}
function saveDriveDocumentRecord(file){
  const {cs,c}=currentCaseForDrive();if(!cs||!c){alert('Case information is unavailable.');return}
  const v=driveFormValues();const title=v.title||file.name||'Google Drive Document';
  const rows=load(S.docs);rows.push({id:uid('doc'),caseId:cs.id,clientId:cs.clientId,clientName:cname(c),title,type:v.type,note:v.note,sourceType:'Google Drive',cloudUrl:file.url||('https://drive.google.com/open?id='+encodeURIComponent(file.id)),fileName:file.name||title,driveFileId:file.id||'',createdAt:now()});
  save(S.docs,rows);document.getElementById('docForm').reset();renderDocs(cs.id);toast('Google Drive document linked');
}
async function chooseGoogleDriveFile(){
  try{
    const token=await ensureGoogleDriveConnected();
    if(RCM_GOOGLE_API_KEY.startsWith('__')){alert('Google Drive is connected. One final Google Cloud setting is still needed before the Drive file chooser can open: a restricted browser API key for Google Picker.');return}
    if(!rcmPickerReady){alert('Google Drive file chooser is still loading. Try again in a moment.');return}
    const view=new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false).setMode(google.picker.DocsViewMode.LIST);
    const picker=new google.picker.PickerBuilder().setAppId(RCM_GOOGLE_APP_ID).setOAuthToken(token).setDeveloperKey(RCM_GOOGLE_API_KEY).addView(view).setCallback(data=>{
      if(data.action===google.picker.Action.PICKED&&data.docs?.length){const d=data.docs[0];saveDriveDocumentRecord({id:d.id,name:d.name,url:d.url})}
    }).build();picker.setVisible(true);
  }catch(e){alert('Could not open Google Drive: '+e.message)}
}
async function uploadFileToGoogleDrive(file){
  const token=await ensureGoogleDriveConnected();
  const boundary='rcm_'+Math.random().toString(36).slice(2);const meta={name:file.name};
  const head='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: '+(file.type||'application/octet-stream')+'\r\n\r\n';
  const tail='\r\n--'+boundary+'--';
  const body=new Blob([head,file,tail],{type:'multipart/related; boundary='+boundary});
  const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},body});
  if(!r.ok){if(r.status===401){rcmGoogleAccessToken='';sessionStorage.removeItem('rcm_google_drive_token');updateGoogleDriveUI()}throw new Error((await r.text())||('Google Drive upload failed ('+r.status+')'))}
  return r.json();
}
async function uploadGoogleDriveFile(){
  try{await ensureGoogleDriveConnected()}catch(e){alert('Google Drive connection failed: '+e.message);return}
  const input=document.getElementById('driveUploadInput');if(!input)return;input.value='';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{toast('Uploading to Google Drive...');const d=await uploadFileToGoogleDrive(file);saveDriveDocumentRecord({id:d.id,name:d.name,url:d.webViewLink})}catch(e){alert('Upload failed: '+e.message)}};input.click();
}
