/* RCM v3.13 authentication + account-status gate */
(function(){
  let checking=false;
  async function apiReady(){
    if(window.pywebview && window.pywebview.api)return;
    await new Promise(resolve=>{const done=()=>resolve();window.addEventListener('pywebviewready',done,{once:true});setTimeout(done,1500)});
  }
  async function handleStatus(status){
    const page=(location.pathname.split('/').pop()||'').toLowerCase();
    if(status && status.authenticated)return true;
    if(status && status.reason==='disabled'){
      alert(status.message||'This account has been disabled. Access has been revoked.');
    }else if(status && status.reason==='session_expired'){
      alert(status.message||'Your secure RCM workday session has expired. Please sign in again.');
    }
    if(page!=='login.html')location.replace('login.html');
    return false;
  }
  async function checkNow(){
    if(checking)return false;checking=true;
    try{
      await apiReady();
      if(!(window.pywebview&&window.pywebview.api&&window.pywebview.api.auth_status))return false;
      return await handleStatus(await window.pywebview.api.auth_status());
    }catch(e){
      console.warn('Authentication check failed',e);
      const page=(location.pathname.split('/').pop()||'').toLowerCase();
      if(page!=='login.html')location.replace('login.html');
      return false;
    }finally{checking=false}
  }
  window.ensureDesktopSecurity=checkNow;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(page!=='login.html'){
    setInterval(checkNow,60000);
    window.addEventListener('focus',checkNow);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNow()});
  }
})();
