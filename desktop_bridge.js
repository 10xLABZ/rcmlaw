/* RCM WEB TEST v1
   Browser compatibility bridge for the existing RCM FIX13 UI.
   This intentionally exposes the same window.pywebview.api surface used by the
   desktop build so the existing pages/app.js can run with minimal changes.

   IMPORTANT: The Supabase publishable key is safe for browser use. No service-role
   or secret key is present here. Privileged user creation/deletion remains inside
   the already-deployed Supabase Edge Function.
*/
(function(){
  'use strict';

  const SUPABASE_URL='https://opgepqcmnbvqgiidqhhp.supabase.co';
  const SUPABASE_KEY='sb_publishable_QQ1F-ngwDTpZGl_6GrygNw_8WD-fPjX';
  const SESSION_KEY='rcm_web_session_v1';
  const AVATAR_KEY='rcm_web_local_avatar_v1';
  const SETTINGS_KEY='rlaw_settings_v4';
  const MAX_WORKDAY_SESSION_MS=12*60*60*1000;

  const COLLECTIONS={
    'rlaw_clients_v4':['clients',{
      id:'id',firstName:'first_name',lastName:'last_name',phone:'phone',email:'email',address:'address',city:'city',state:'state',zip:'zip',createdAt:'created_at',updatedAt:'updated_at'
    }],
    'rlaw_cases_v4':['cases',{
      id:'id',clientId:'client_id',caseType:'case_type',subCaseType:'sub_case_type',caseNumber:'case_number',caseStatus:'case_status',serviceQuote:'service_quote',court:'court',judge:'judge',caseNotes:'case_notes',nextCourtDate:'next_court_date',nextCourtDateNote:'next_court_date_note',nextLegalDate:'next_legal_date',nextLegalDateNote:'next_legal_date_note',createdAt:'created_at',updatedAt:'updated_at'
    }],
    'rlaw_contact_v4':['contact_updates',{id:'id',clientId:'client_id',type:'type',text:'text',createdAt:'created_at'}],
    'rlaw_notes_v4':['case_notes',{id:'id',caseId:'case_id',clientId:'client_id',text:'text',createdAt:'created_at',updatedAt:'updated_at'}],
    'rlaw_tasks_v4':['tasks',{id:'id',caseId:'case_id',clientId:'client_id',clientName:'client_name',text:'text',dueDate:'due_date',priority:'priority',done:'done',createdAt:'created_at'}],
    'rlaw_payments_v4':['payments',{id:'id',caseId:'case_id',clientId:'client_id',invoiceId:'invoice_id',amount:'amount',date:'date',method:'method',reference:'reference',note:'note',createdAt:'created_at'}],
    'rlaw_invoices_v4':['invoices',{id:'id',caseId:'case_id',clientId:'client_id',number:'number',date:'date',dueDate:'due_date',description:'description',amount:'amount',status:'status',note:'note',createdAt:'created_at'}],
    'rlaw_court_dates_v1':['court_dates',{id:'id',caseId:'case_id',clientId:'client_id',date:'date',time:'time',type:'type',note:'note',done:'done',completionNote:'completion_note',createdAt:'created_at',completedAt:'completed_at'}],
    'rlaw_legal_dates_v1':['legal_dates',{id:'id',caseId:'case_id',clientId:'client_id',date:'date',time:'time',type:'type',note:'note',done:'done',completionNote:'completion_note',createdAt:'created_at',completedAt:'completed_at'}],
    'rlaw_opposing_counsel_v1':['opposing_counsel',{id:'id',caseId:'case_id',clientId:'client_id',attorneyName:'attorney_name',firm:'firm',phone:'phone',email:'email',address:'address',note:'note',createdAt:'created_at',updatedAt:'updated_at'}],
    'rlaw_docs_v4':['documents',{id:'id',caseId:'case_id',clientId:'client_id',clientName:'client_name',title:'title',type:'type',note:'note',fileName:'file_name',filePath:'file_path',sourceType:'source_type',cloudUrl:'cloud_url',createdAt:'created_at'}]
  };

  let session=loadSession();
  let profile=null;
  let baseline={};

  function loadSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}
  }
  function saveSession(s){session=s||null;if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY)}
  function currentUser(){
    if(!session||!session.user)return null;
    const p=profile||session.profile||{};
    return {id:session.user.id,email:session.user.email,first_name:p.first_name||null,last_name:p.last_name||null,role:p.role||'staff',active:p.active!==false};
  }
  function jwtExp(token){
    try{const p=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return Number(p.exp||0)}catch(_){return 0}
  }
  async function refreshIfNeeded(){
    if(!session||!session.refresh_token)return false;
    const exp=jwtExp(session.access_token||'');
    if(exp && exp-Date.now()/1000>90)return true;
    try{
      const data=await request('POST','/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token},false,false);
      session={access_token:data.access_token,refresh_token:data.refresh_token||session.refresh_token,user:data.user||session.user,profile:profile||session.profile||null,session_started_at:session.session_started_at||Date.now()};
      saveSession(session);return true;
    }catch(e){console.warn('Session refresh failed',e);saveSession(null);profile=null;return false}
  }
  async function request(method,path,body,auth=true,retry=true,extraHeaders={}){
    if(auth)await refreshIfNeeded();
    const headers={apikey:SUPABASE_KEY,Accept:'application/json',...extraHeaders};
    if(body!==undefined&&body!==null)headers['Content-Type']='application/json';
    if(auth&&session&&session.access_token)headers.Authorization='Bearer '+session.access_token;
    let resp;
    try{resp=await fetch(SUPABASE_URL.replace(/\/$/,'')+path,{method,headers,body:(body===undefined||body===null)?undefined:JSON.stringify(body)})}
    catch(e){throw new Error('Could not reach the secure cloud service. Check the internet connection. ('+String(e.message||e)+')')}
    const raw=await resp.text();let data=null;
    if(raw){try{data=JSON.parse(raw)}catch(_){data=raw}}
    if(!resp.ok){
      if(resp.status===401&&auth&&retry&&session&&session.refresh_token){
        const oldExp=jwtExp(session.access_token||'');
        if(!oldExp||oldExp<=Date.now()/1000+120){await refreshIfNeeded();return request(method,path,body,auth,false,extraHeaders)}
      }
      const msg=(data&&typeof data==='object'&&(data.msg||data.message||data.error_description||data.error))||String(data||resp.statusText||'Request failed');
      const err=new Error(`${resp.status}: ${msg}`);err.status=resp.status;throw err;
    }
    return data;
  }
  async function fetchProfile(){
    if(!session||!session.user||!session.user.id)return null;
    const rows=await request('GET',`/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,first_name,last_name,role,active,created_at`);
    profile=Array.isArray(rows)&&rows[0]?rows[0]:null;
    if(session){session.profile=profile;saveSession(session)}
    return profile;
  }
  function friendlyAuthError(message){
    const low=String(message||'').toLowerCase();
    if(low.includes('invalid login credentials'))return 'Incorrect email or password.';
    if(low.includes('email not confirmed'))return 'This email account has not been confirmed yet.';
    if(low.includes('failed to fetch')||low.includes('network')||low.includes('could not reach'))return 'Could not reach the secure cloud service. Check the internet connection.';
    return String(message||'Sign in failed.');
  }
  function normalizeRow(table,row){
    row={...row};
    if(table==='cases'&&Object.prototype.hasOwnProperty.call(row,'service_quote')){
      const v=row.service_quote;row.service_quote=(v===''||v==null)?null:Number(String(v).replace(/[$,]/g,''));if(Number.isNaN(row.service_quote))throw new Error('Agreed Fee must be a number.');
    }
    if((table==='payments'||table==='invoices')&&Object.prototype.hasOwnProperty.call(row,'amount')){
      const v=row.amount;row.amount=(v===''||v==null)?null:Number(String(v).replace(/[$,]/g,''));if(Number.isNaN(row.amount))throw new Error('Amount must be a number.');
    }
    if(table==='invoices'&&row.number!==''&&row.number!=null)row.number=parseInt(row.number,10);
    return row;
  }
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}

  const api={
    async ping(){return {ok:true,mode:'web',project:SUPABASE_URL}},
    async auth_login(email,password){
      email=String(email||'').trim();password=String(password||'');
      if(!email||!password)return {ok:false,error:'Enter your email and password.'};
      try{
        const data=await request('POST','/auth/v1/token?grant_type=password',{email,password},false);
        session={access_token:data.access_token,refresh_token:data.refresh_token,user:data.user,profile:null,session_started_at:Date.now()};saveSession(session);
        await fetchProfile();
        if(profile&&profile.active===false){await api.auth_logout();return {ok:false,error:'This account has been disabled. Access has been revoked.'}}
        return {ok:true,user:currentUser()};
      }catch(e){return {ok:false,error:friendlyAuthError(e.message||e)}}
    },
    async auth_status(){
      if(!session||!session.access_token||!session.user)return {authenticated:false,user:null};
      if(!session.session_started_at){session.session_started_at=Date.now();saveSession(session)}
      if(Date.now()-Number(session.session_started_at)>MAX_WORKDAY_SESSION_MS){await api.auth_logout();return {authenticated:false,user:null,reason:'session_expired',message:'Your secure RCM workday session has expired. Please sign in again.'}}
      if(!await refreshIfNeeded())return {authenticated:false,user:null};
      try{
        await fetchProfile();
        if(profile&&profile.active===false){await api.auth_logout();return {authenticated:false,user:null,reason:'disabled',message:'This account has been disabled. Access has been revoked.'}}
      }catch(e){console.warn(e)}
      return {authenticated:true,user:currentUser()};
    },
    async current_user(){if(!profile&&session)try{await fetchProfile()}catch(_){}return currentUser()},
    async auth_logout(){
      try{if(session&&session.access_token)await request('POST','/auth/v1/logout',{},true,false)}catch(_){}
      saveSession(null);profile=null;baseline={};return {ok:true};
    },
    async security_status(){return {enabled:true,has_pin:false,cloud_auth:true,authenticated:!!(session&&session.access_token)}},

    async cloud_get_all(){
      if(!session||!session.access_token)return {ok:false,auth_required:true,error:'Sign in required.'};
      try{
        if(!profile)await fetchProfile();
        const store={};baseline={};
        for(const [key,[table,mapping]] of Object.entries(COLLECTIONS)){
          const rows=await request('GET',`/rest/v1/${table}?select=*`)||[];
          const reverse=Object.fromEntries(Object.entries(mapping).map(([js,db])=>[db,js]));
          const converted=rows.map(row=>{const out={};for(const [k,v] of Object.entries(row))if(reverse[k])out[reverse[k]]=v;return out});
          store[key]=JSON.stringify(converted);baseline[key]=JSON.parse(JSON.stringify(converted));
        }
        const settings=await request('GET','/rest/v1/settings?select=key,value')||[];
        store[SETTINGS_KEY]=JSON.stringify(Object.fromEntries(settings.map(r=>[r.key,r.value])));
        return {ok:true,store,user:currentUser()};
      }catch(e){if(e.status===401)return {ok:false,auth_required:true,error:'Sign in required.'};return {ok:false,error:String(e.message||e)}}
    },

    async cloud_persist(key,rawValue){
      if(!session||!session.access_token)return {ok:false,auth_required:true,error:'Sign in required.'};
      try{
        if(key===SETTINGS_KEY){
          const obj=JSON.parse(rawValue||'{}');if(!obj||Array.isArray(obj)||typeof obj!=='object')throw new Error('Expected a settings object.');
          const rows=Object.entries(obj).map(([k,v])=>({key:String(k),value:v==null?'':String(v)}));
          if(rows.length)await request('POST','/rest/v1/settings?on_conflict=key',rows,true,true,{Prefer:'resolution=merge-duplicates,return=minimal'});
          const existing=await request('GET','/rest/v1/settings?select=key')||[],keep=new Set(rows.map(r=>r.key));
          for(const r of existing)if(r.key&&!keep.has(r.key))await request('DELETE',`/rest/v1/settings?key=eq.${encodeURIComponent(String(r.key))}`,null,true,true,{Prefer:'return=minimal'});
          return {ok:true};
        }
        if(!COLLECTIONS[key])return {ok:true,local_only:true};
        const [table,mapping]=COLLECTIONS[key],items=JSON.parse(rawValue||'[]');if(!Array.isArray(items))throw new Error('Expected a list.');
        const base=baseline[key]||[],baseBy=Object.fromEntries(base.filter(x=>x&&x.id).map(x=>[String(x.id),x])),curBy=Object.fromEntries(items.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
        const changedIds=Object.keys(curBy).filter(id=>!same(baseBy[id],curBy[id])),deletedIds=Object.keys(baseBy).filter(id=>!curBy[id]);
        const changedRows=[];
        for(const id of changedIds){const item=curBy[id],row={};for(const [js,db] of Object.entries(mapping))if(Object.prototype.hasOwnProperty.call(item,js))row[db]=item[js];if(row.id)changedRows.push(normalizeRow(table,row))}
        if(changedRows.length)await request('POST',`/rest/v1/${table}?on_conflict=id`,changedRows,true,true,{Prefer:'resolution=merge-duplicates,return=minimal'});
        for(const id of deletedIds)await request('DELETE',`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,null,true,true,{Prefer:'return=minimal'});
        baseline[key]=JSON.parse(JSON.stringify(items));return {ok:true,changed:changedRows.length,deleted:deletedIds.length};
      }catch(e){return {ok:false,error:String(e.message||e)}}
    },

    async acquire_client_lock(clientId){
      try{const u=currentUser()||{},name=[u.first_name,u.last_name].filter(Boolean).join(' ')||u.email||'Another user';let r=await request('POST','/rest/v1/rpc/acquire_client_lock',{p_client_id:String(clientId||''),p_user_name:name});if(Array.isArray(r))r=r[0]||null;return r&&typeof r==='object'?{ok:true,...r}:{ok:false,error:'Could not obtain edit lock.'}}catch(e){return {ok:false,error:String(e.message||e)}}
    },
    async heartbeat_client_lock(clientId){try{const r=await request('POST','/rest/v1/rpc/heartbeat_client_lock',{p_client_id:String(clientId||'')});return {ok:true,held:!!r}}catch(e){return {ok:false,error:String(e.message||e)}}},
    async release_client_lock(clientId){try{if(session)await request('POST','/rest/v1/rpc/release_client_lock',{p_client_id:String(clientId||'')});return {ok:true}}catch(e){return {ok:false,error:String(e.message||e)}}},

    async list_profiles(){
      try{if(!profile)await fetchProfile();const rows=await request('GET','/rest/v1/profiles?select=id,first_name,last_name,role,active,created_at&order=created_at.asc')||[];return {ok:true,profiles:rows,current_user:currentUser()}}catch(e){return {ok:false,error:String(e.message||e)}}
    },
    async update_profile_admin(userId,firstName,lastName,role,active){
      try{
        if(!profile)await fetchProfile();const caller=String(profile&&profile.role||'staff');if(!['system_admin','admin','owner_admin'].includes(caller))return {ok:false,error:'Administrator access required.'};
        if(session&&session.user&&String(session.user.id)===String(userId)){const currentRole=String(profile&&profile.role||'staff');if(String(role||'')!==currentRole||active===false)return {ok:false,error:'You cannot deactivate or change the role of your own administrator account.'};}
        role=String(role||'staff').trim();if(role==='system_admin'&&caller!=='system_admin')return {ok:false,error:'Only the 10xLABZ system administrator can assign system_admin.'};
        await request('PATCH',`/rest/v1/profiles?id=eq.${encodeURIComponent(String(userId))}`,{first_name:String(firstName||'').trim()||null,last_name:String(lastName||'').trim()||null,role,active:!!active},true,true,{Prefer:'return=minimal'});
        if(session&&session.user&&String(session.user.id)===String(userId))await fetchProfile();return {ok:true};
      }catch(e){return {ok:false,error:String(e.message||e)}}
    },
    async create_staff_user(firstName,lastName,email,password,role='staff'){
      try{
        const r=await request('POST','/functions/v1/create-rcm-user',{first_name:firstName,last_name:lastName,email,password,role});return (r&&typeof r==='object')?r:{ok:false,error:'Could not create account.'};
      }catch(e){return {ok:false,error:String(e.message||e)}}
    },
    async delete_user_admin(userId){
      try{if(session&&session.user&&String(session.user.id)===String(userId))return {ok:false,error:'You cannot delete your own account.'};const r=await request('POST','/functions/v1/create-rcm-user',{action:'delete',user_id:String(userId||'')});return (r&&typeof r==='object')?r:{ok:false,error:'Could not delete user.'}}catch(e){return {ok:false,error:String(e.message||e)}}
    },

    async preview_legacy_import(){return {ok:false,error:'Legacy SQLite import is desktop-only. Use the existing RCM migration utility for the one-time database import.'}},
    async commit_legacy_import(){return {ok:false,error:'Legacy SQLite import is desktop-only.'}},

    async choose_file(){
      alert('Web test limitation: browsers cannot permanently link arbitrary Windows file paths. Existing cloud data is safe; document storage will be adapted separately.');return null;
    },
    async open_file(path){
      const d=String(path||'');if(/^https?:\/\//i.test(d)){window.open(d,'_blank','noopener');return {ok:true}}return {ok:false,error:'This is a local Windows file path. A browser cannot open another computer\'s local path. Document storage will be adapted separately for the web version.'};
    },
    async open_folder(){return {ok:false,error:'Opening Windows folders is not available in the web test.'}},
    async choose_local_avatar(){
      return await new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>{const f=input.files&&input.files[0];if(!f)return resolve({ok:false,cancelled:true});const r=new FileReader();r.onload=()=>{try{localStorage.setItem(AVATAR_KEY,String(r.result));resolve({ok:true,data_url:String(r.result)})}catch(e){resolve({ok:false,error:String(e.message||e)})}};r.onerror=()=>resolve({ok:false,error:'Could not read image.'});r.readAsDataURL(f)};input.click()})
    },
    async get_local_avatar(){return {ok:true,data_url:localStorage.getItem(AVATAR_KEY)||null}},
    async save_text_file(name,content){
      try{const blob=new Blob([String(content||'')],{type:'text/html;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=String(name||'RCM_File.html');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);return {ok:true}}catch(e){return {ok:false,error:String(e.message||e)}}
    },
    async save_pdf_file(name,html){
      try{const w=window.open('','_blank');if(!w)return {ok:false,error:'Pop-up blocked. Allow pop-ups for RCM and try again.'};w.document.open();w.document.write(String(html||''));w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(_){}},350);return {ok:true,print_dialog:true,name:String(name||'RCM.pdf')}}catch(e){return {ok:false,error:String(e.message||e)}}
    },
    async backup_database(){return {ok:false,error:'Cloud RCM data is stored in Supabase; desktop SQLite backup does not apply to the web test.'}},
    async restore_database(){return {ok:false,error:'Desktop SQLite restore does not apply to the web test.'}},
    async open_backup_folder(){return {ok:false,error:'Desktop backup folder is not used by the web test.'}}
  };

  window.pywebview={api};
  window.__rcmWebTest=true;
  // Preserve the event expected by a few existing helper functions.
  queueMicrotask(()=>window.dispatchEvent(new Event('pywebviewready')));

  window.desktopHydrate=async function(){
    try{
      const result=await api.cloud_get_all();
      if(result&&result.auth_required){if((location.pathname.split('/').pop()||'').toLowerCase()!=='login.html')location.replace('login.html');return false}
      if(!result||!result.ok){console.warn('Cloud hydration failed:',result&&result.error);window.__cloudSyncError=result&&result.error?result.error:'Cloud sync failed.';return false}
      for(const [k,v] of Object.entries(result.store||{}))try{localStorage.setItem(k,v)}catch(_){}
      window.__desktopMode=false;window.__cloudMode=true;window.__webMode=true;window.__currentUser=result.user||null;
      const userLabel=document.querySelector('.top-user span');if(userLabel&&result.user){const name=[result.user.first_name,result.user.last_name].filter(Boolean).join(' ');userLabel.textContent=name||result.user.email||'User'}
      return true;
    }catch(e){console.warn('Cloud hydration failed:',e);window.__cloudSyncError=String(e.message||e);return false}
  };
  window.desktopPersist=async (key,value)=>{const r=await api.cloud_persist(key,value);window.__cloudSyncError=(r&&r.ok)?null:((r&&r.error)||'Cloud save failed.');return r};
  window.desktopChooseFile=()=>api.choose_file();
  window.desktopOpenFile=path=>api.open_file(path);
  window.desktopSignOut=async function(){try{await api.auth_logout()}catch(_){}try{sessionStorage.clear();for(const k of Object.keys(localStorage)){if(k.startsWith('rlaw_'))localStorage.removeItem(k)}}catch(_){}location.replace('login.html')};
  window.desktopSaveTextFile=(name,content)=>api.save_text_file(name,content);
  window.desktopSavePdfFile=(name,html)=>api.save_pdf_file(name,html);
})();
