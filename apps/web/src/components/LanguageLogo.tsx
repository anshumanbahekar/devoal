import Image from "next/image";

const logos: Record<string, string> = {
  python: "python", javascript: "javascript", typescript: "typescript",
  cpp: "cpp", rust: "rust", go: "go", java: "java", sql: "sql",
};

export function LanguageLogo({ id, name }: { id: string; name: string }) {
  return <span className={`language-icon ${id === "rust" ? "rust-logo" : ""}`} aria-hidden="true">
    <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icons/${logos[id] || id}.svg`} alt="" width={30} height={30} title={id === "sql" ? "PostgreSQL" : name} />
  </span>;
}
