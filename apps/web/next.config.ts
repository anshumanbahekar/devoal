import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = staticExport ? "/devoal" : "";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export", trailingSlash: true, basePath, images: { unoptimized: true } } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC_SITE: staticExport ? "1" : "0" },
};

export default nextConfig;
