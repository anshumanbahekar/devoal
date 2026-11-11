"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { GithubAuthProvider, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "@firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "@firebase/firestore";
import { firebaseConfigured, getFirebase } from "@/lib/firebase";
import { emptyProgress, mergeProgress, normalizeProgress, readProgress, updateProgress } from "@/lib/progress";

type AuthContextValue = { user: User|null; loading: boolean; configured: boolean; error: string|null; signIn: (provider:"google"|"github")=>Promise<void>; signOutUser: ()=>Promise<void> };
const AuthContext=createContext<AuthContextValue|null>(null);
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error("AuthProvider missing");return value;}

export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<User|null>(null);
  const [loading,setLoading]=useState(firebaseConfigured);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    const client=getFirebase();if(!client)return;
    let active=true;
    const unsubscribe=onAuthStateChanged(client.auth,async nextUser=>{
      if(!active)return;
      setUser(null);setLoading(true);
      if(nextUser){
        try{
          const ref=doc(client.db,"users",nextUser.uid,"state","progress");
          const snapshot=await getDoc(ref);
          if(!active)return;
          const previousUid=localStorage.getItem("devoal.lastUid");
          const local=previousUid && previousUid!==nextUser.uid ? emptyProgress : readProgress();
          const merged=mergeProgress(local,normalizeProgress(snapshot.exists()?snapshot.data().progress:{}));
          updateProgress(()=>merged);
          await setDoc(ref,{progress:merged,updatedAt:serverTimestamp()});
          localStorage.setItem("devoal.lastUid",nextUser.uid);
          setError(null);
        }catch{setError("Signed in, but cloud progress could not load. Local progress is still available.");}
      }
      if(active){setUser(nextUser);setLoading(false);}
    },()=>{setError("Sign-in state could not be loaded.");setLoading(false);});
    return()=>{active=false;unsubscribe();};
  },[]);
  useEffect(()=>{
    if(!user)return;
    const client=getFirebase();if(!client)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const sync=()=>{clearTimeout(timer);timer=setTimeout(async()=>{if(client.auth.currentUser?.uid!==user.uid)return;try{await setDoc(doc(client.db,"users",user.uid,"state","progress"),{progress:readProgress(),updatedAt:serverTimestamp()});setError(null);}catch{setError("Cloud sync is paused. Your work is saved in this browser.");}},900);};
    window.addEventListener("devoal-progress",sync);
    return()=>{window.removeEventListener("devoal-progress",sync);clearTimeout(timer);};
  },[user]);
  async function signIn(provider:"google"|"github"){
    const client=getFirebase();if(!client){setError("Sign-in is not configured for this deployment yet.");return;}
    setError(null);
    try{await signInWithPopup(client.auth,provider==="google"?new GoogleAuthProvider():new GithubAuthProvider());}
    catch(e){const code=(e as {code?:string}).code;setError(code==="auth/popup-closed-by-user"?"Sign-in window was closed.":"Sign-in failed. Check the provider setup and try again.");}
  }
  async function signOutUser(){const client=getFirebase();if(client)await signOut(client.auth);}
  const value=useMemo(()=>({user,loading,configured:firebaseConfigured,error,signIn,signOutUser}),[user,loading,error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
