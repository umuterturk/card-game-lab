// Standalone PWA and TWA share this bootstrap. Portal iframe restrictions
// may disable service workers; normal online play must still work.
export function registerOverswingOffline(host=typeof window!=='undefined'?window:null){
  if(!host?.navigator?.serviceWorker)return false;
  const register=()=>{
    const workerUrl=new URL('./sw.js',host.location.href);
    host.navigator.serviceWorker.register(workerUrl.href,{scope:'./'})
      .then(registration=>{
        // Refresh the precache when returning online, without interrupting a run.
        host.addEventListener('online',()=>registration.update().catch(()=>{}));
      })
      .catch(()=>{}); // Safe fallback for restrictive portal iframe policies.
  };
  if(host.document.readyState==='complete')register();
  else host.addEventListener('load',register,{once:true});
  return true;
}
