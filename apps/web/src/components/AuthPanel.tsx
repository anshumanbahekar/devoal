"use client";
import { useAuth } from "./AuthProvider";

export function AuthPanel(){
  const {user,loading,configured,error,signIn,signOutUser}=useAuth();
  return <section className="auth-panel" aria-label="Account">
    <div><span className="eyebrow">YOUR ACCOUNT</span><h2>{user?`Signed in as ${user.displayName||user.email||"developer"}`:"Save progress across devices"}</h2><p>{user?"Lessons, solutions, bookmarks, and reviews sync to your account.":configured?"Continue with Google or GitHub to keep your learning progress in sync.":"Account sign-in needs Firebase configuration. Your progress is saved in this browser for now."}</p>{error&&<p className="auth-error" role="alert">{error}</p>}</div>
    <div className="auth-actions">{loading?<span className="notice">Checking account…</span>:user?<button className="button subtle" onClick={()=>void signOutUser()}>Sign out</button>:<><button className="button subtle auth-button" disabled={!configured} onClick={()=>void signIn("google")}><img src={`${process.env.NEXT_PUBLIC_BASE_PATH||""}/icons/google.svg`} alt=""/> Google</button><button className="button subtle auth-button" disabled={!configured} onClick={()=>void signIn("github")}><img className="github-icon" src={`${process.env.NEXT_PUBLIC_BASE_PATH||""}/icons/github.svg`} alt=""/> GitHub</button></>}</div>
  </section>;
}
