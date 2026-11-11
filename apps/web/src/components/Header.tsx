"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const links = [
  ["/", "Overview"], ["/learn", "Learn"], ["/practice", "Problems"], ["/review", "Review"],
  ["/resources", "Resources"], ["/profile", "Profile"],
];

export function Header() {
  const pathname = usePathname();
  const {user}=useAuth();
  return <header className="site-header">
    <Link className="brand" href="/" aria-label="Devoal home"><Image className="brand-logo" src={`${process.env.NEXT_PUBLIC_BASE_PATH||""}/devoal-logo.png`} alt="" width={34} height={34}/><span>devoal<span className="brand-dot">.</span></span></Link>
    <nav className="main-nav" aria-label="Main navigation">{links.map(([href, label]) =>
      <Link key={href} href={href} className={pathname === href || (href !== "/" && pathname.startsWith(href + "/")) ? "active" : ""}>{label}</Link>
    )}</nav>
    <Link href="/profile" className="header-action">{user?`Hi, ${user.displayName?.split(" ")[0]||"coder"}`:"Sign in"} <span aria-hidden="true">↗</span></Link>
  </header>;
}
