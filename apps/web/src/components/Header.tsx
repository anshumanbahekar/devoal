"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Overview"], ["/learn", "Learn"], ["/practice", "Problems"], ["/review", "Review"],
  ["/resources", "Resources"], ["/profile", "Profile"],
];

export function Header() {
  const pathname = usePathname();
  return <header className="site-header">
    <Link className="brand" href="/" aria-label="Devoal home"><span className="brand-mark">D</span><span>devoal<span className="brand-dot">.</span></span></Link>
    <nav className="main-nav" aria-label="Main navigation">{links.map(([href, label]) =>
      <Link key={href} href={href} className={pathname === href || (href !== "/" && pathname.startsWith(href + "/")) ? "active" : ""}>{label}</Link>
    )}</nav>
    <Link href="/practice" className="header-action">Start solving <span aria-hidden="true">↗</span></Link>
  </header>;
}
