/* RCM v2 Cloud authentication gate */
(function(){
  async function apiReady(){
    if(window.pywebview && window.pywebview.api)return;
    await new Promise(resolve=>{
      const done=()=>resolve();
      window.addEventListener('pywebviewready',done,{once:true});
      setTimeout(done,1500);
    });
  }
  window.ensureDesktopSecurity = async function(){
    try{
      await apiReady();
      if(!(window.pywebview && window.pywebview.api && window.pywebview.api.auth_status))return false;
      const status=await window.pywebview.api.auth_status();
      if(status && status.authenticated)return true;
      const page=(location.pathname.split('/').pop()||'').toLowerCase();
      if(page!=='login.html')location.replace('login.html');
      return false;
    }catch(e){
      console.warn('Authentication check failed',e);
      const page=(location.pathname.split('/').pop()||'').toLowerCase();
      if(page!=='login.html')location.replace('login.html');
      return false;
    }
  };
})();
