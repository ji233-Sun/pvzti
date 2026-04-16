import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";

const fontVariables = {
  "--font-geist-sans":
    '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  "--font-mono":
    '"JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace',
} as CSSProperties;

export const metadata: Metadata = {
  title: {
    default: "植物人格测评 | PVZTI",
    template: "%s | PVZTI",
  },
  description:
    "探索你的植物人格！基于五维人格体系的趣味测评，在 305 种植物中找到最契合你的那一个。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={cn("h-full antialiased")} style={fontVariables}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
