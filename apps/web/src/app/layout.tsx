import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Devoal by Study Sharpener", template: "%s | Devoal by Study Sharpener" },
  publisher: "Study Sharpener",
  description: "Learn programming from beginner to advanced with lessons, coding problems, resources, and a personal progress profile.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider><Header />{children}<footer className="site-footer"><span>Devoal by Study Sharpener</span><span>Open source coding education</span></footer></AuthProvider></body></html>;
}
