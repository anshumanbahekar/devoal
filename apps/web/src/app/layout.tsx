import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Devoal — Learn, practice, improve", template: "%s | Devoal" },
  description: "Learn programming from beginner to advanced with lessons, coding problems, resources, and a personal progress profile.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Header />{children}<footer className="site-footer"><span>devoal<span className="brand-dot">.</span></span><span>Learn deeply. Practice deliberately. Build confidently.</span><span>Open source coding education</span></footer></body></html>;
}
