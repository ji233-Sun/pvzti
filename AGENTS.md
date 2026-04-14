<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tech Stack

- Framework: `Next.js 16` with App Router.
- UI: `React 19`.
- Language: `TypeScript 5`.
- Styling: `Tailwind CSS 4`.
- Component system: `shadcn/ui` with `radix-luma` style preset.
- Icons: `lucide-react`.
- Utility stack: `class-variance-authority`, `clsx`, `tailwind-merge`.
- Theme source: `app/globals.css` with CSS variables enabled.

## shadcn/ui Usage

- Prefer existing primitives in `components/ui` before creating custom base components.
- Import shared UI primitives through the alias path `@/components/ui/*`.
- Build page and feature components by composing `shadcn/ui` primitives instead of rewriting low-level controls.
- Use `@/lib/utils` `cn()` for class merging; follow the existing `cva`-based variant pattern when extending shared UI.
- Prefer semantic design tokens such as `bg-background`, `text-foreground`, `bg-primary`, `border-border`, and other CSS-variable-backed classes defined in `app/globals.css`. Avoid hardcoded colors unless there is a clear product requirement.
- Follow the repository `components.json` configuration when adding or regenerating components: `style: radix-luma`, `baseColor: zinc`, `cssVariables: true`, `iconLibrary: lucide`.
- Keep app-specific composition and business styling outside `components/ui`. Only change files in `components/ui` when the adjustment is meant to be shared across the application.
