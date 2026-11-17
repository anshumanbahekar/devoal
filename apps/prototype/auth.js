import {syncKeys,readBrowserState,mergeBrowserState} from "./auth-data.js";

const accountButton=document.getElementById("account-button");
let config;try{const response=await fetch("firebase-config.json",{cache:"no-store"});if(response.ok)config=await response.json()}catch(e){}
if(config&&["apiKey","authDomain","projectId","appId"].every(key=>typeof config[key]==="string"&&config[key].trim())){
  const dialog=document.createElement("dialog");dialog.className="dv-auth";
  dialog.innerHTML='<div class="dv-auth-head"><h2>Devoal account</h2><button id="auth-close" aria-label="Close account dialog">×</button></div><p id="auth-description">Save your work across devices.</p><p id="auth-status" role="status"></p><div class="dv-auth-actions"><button id="auth-google"><img src="icons/google.svg" alt="">Continue with Google</button><button id="auth-github"><img src="icons/github.svg" alt="">Continue with GitHub</button><button id="auth-out" hidden>Sign out</button></div><p class="dv-auth-note">Your first sign-in merges completed work and practice attempts. Your account data is private to your Firebase user ID.</p>';
  document.body.append(dialog);accountButton.hidden=false;
  accountButton.addEventListener("click",()=>dialog.showModal());
  dialog.querySelector("#auth-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
  try{
    const [{initializeApp},{getAuth,GoogleAuthProvider,GithubAuthProvider,signInWithPopup,signOut,onAuthStateChanged},{getFirestore,doc,getDoc,setDoc,serverTimestamp}]=await Promise.all([
      import("https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js")
    ]);
    const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app),status=dialog.querySelector("#auth-status"),description=dialog.querySelector("#auth-description");
    const google=dialog.querySelector("#auth-google"),github=dialog.querySelector("#auth-github"),out=dialog.querySelector("#auth-out");
    let currentUser=null,lastSynced="",syncing=false;
    const showUser=user=>{currentUser=user;accountButton.textContent=user?"Account":"Sign in";description.textContent=user?`Signed in as ${user.displayName||user.email||"a developer"}. Your work syncs to this account.`:"Save your work across devices with Google or GitHub.";google.hidden=!!user;github.hidden=!!user;out.hidden=!user};
    const writeCloud=async()=>{if(!currentUser||syncing)return;const state=readBrowserState(localStorage),serialized=JSON.stringify(state);if(serialized===lastSynced)return;if(serialized.length>750_000){status.textContent="Cloud sync is paused because your local work is too large. Export a backup from Progress.";return}syncing=true;try{await setDoc(doc(db,"users",currentUser.uid,"state","progress"),{state,clientAt:Date.now(),updatedAt:serverTimestamp()});lastSynced=serialized;status.textContent="Saved to your account."}catch(e){status.textContent="Cloud sync is paused. Your work is still in this browser."}finally{syncing=false}};
    onAuthStateChanged(auth,async user=>{showUser(user);if(!user){status.textContent="";return}status.textContent="Loading your account…";
      try{const ref=doc(db,"users",user.uid,"state","progress"),remote=await getDoc(ref),local=readBrowserState(localStorage),priorUid=localStorage.getItem("dv-last-uid"),merged=mergeBrowserState(local,remote.exists()?remote.data().state||{}:{},{differentUser:!!priorUid&&priorUid!==user.uid});
        let changed=false;for(const key of syncKeys){const value=merged[key]??null;if(value!==local[key]){changed=true;if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}}
        localStorage.setItem("dv-last-uid",user.uid);lastSynced="";await writeCloud();if(changed)location.reload()
      }catch(e){status.textContent="Account connected, but cloud progress could not load. Browser progress is still available."}
    },()=>{status.textContent="Could not check account status. Refresh and try again."});
    setInterval(writeCloud,5000);
    const signIn=async provider=>{status.textContent="Opening sign-in…";try{await signInWithPopup(auth,provider)}catch(error){status.textContent=error?.code==="auth/popup-closed-by-user"?"Sign-in window was closed.":error?.code==="auth/account-exists-with-different-credential"?"This email already uses another sign-in provider. Choose that provider first.":"Sign-in failed. Check the provider setup and try again."}};
    google.addEventListener("click",()=>signIn(new GoogleAuthProvider()));
    github.addEventListener("click",()=>signIn(new GithubAuthProvider()));
    out.addEventListener("click",async()=>{try{await signOut(auth);dialog.close()}catch(e){status.textContent="Could not sign out. Try again."}});
  }catch(e){dialog.querySelector("#auth-status").textContent="Account service could not load. Your work is still saved in this browser."}
}
