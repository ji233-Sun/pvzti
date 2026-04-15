import type { ReactNode } from "react";

export default function QuizLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(253,230,138,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(134,239,172,0.18),transparent_24%),linear-gradient(180deg,#fffdf6_0%,#f5f2e8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </main>
  );
}
