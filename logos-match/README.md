This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## InsForge (MVP setup)

The `/api/templates` and `/api/rooms` endpoints require DB tables to exist in InsForge.

1. Open your InsForge Dashboard.
2. Go to SQL Editor / Query Console.
3. Run the schema script: [001_quizzes.sql](file:///workspace/logos-match/insforge/schema/001_quizzes.sql).
4. (Optional) Seed example templates: [003_seed_templates.sql](file:///workspace/logos-match/insforge/schema/003_seed_templates.sql).

RLS note: do not run [002_rls.sql](file:///workspace/logos-match/insforge/schema/002_rls.sql) until you have policies in place (or you are certain your server key bypasses it and you understand the implications).

### Environment variables

Server-only (Vercel / local):
- `INSFORGE_URL`
- `INSFORGE_SERVICE_KEY`

NVIDIA NIM (server-only):
- `NVIDIA_NIM_API_KEY`
- `NVIDIA_NIM_MODEL` (optional)
- `NVIDIA_NIM_BASE_URL` (optional)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
