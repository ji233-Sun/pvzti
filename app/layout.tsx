import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";

const fontVariables = {
  "--font-geist-sans":
    '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif',
  "--font-geist-mono":
    '"JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace',
  "--font-mono":
    '"JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace',
} as CSSProperties;

export const metadata: Metadata = {
  title: {
    default: "PVZTI",
    template: "%s | PVZTI",
  },
  description: "一个借鉴 MBTI 节奏的植物人格测评站点。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={cn("h-full", "antialiased", "font-mono")}
      style={fontVariables}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
