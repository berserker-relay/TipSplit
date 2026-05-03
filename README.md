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

### PDF export requirements

Receipt generation relies on a local Python environment:

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install reportlab   # Windows
# or
.venv/bin/python -m pip install reportlab           # macOS / Linux
```

When you click **Download PDF** the app calls `/api/pdf`, which shells out to `scripts/render_pdf.py`. Generated files land under `public/pdf/` and are git-ignored by default. If you deploy to Vercel, add a storage target (S3, Supabase storage, etc.) or clear the directory during build. See `DEPLOY.md` for full launch instructions.

### Testing

Run the end-to-end smoke test (requires the Playwright browsers, install once via `npx playwright install`):

```bash
npm run test:e2e
```

This boots the dev server on port 4310 and verifies the calculator math at a high level.

### Email capture storage

By default captures append to `data/captures.json`. To switch to Supabase, set:

```
SUPABASE_URL=<project-url>
SUPABASE_ANON_KEY=<service-or-anon-key>
SUPABASE_TABLE=captures # optional, defaults to "captures"
```

When those env vars exist, `/api/capture` writes straight to Supabase; otherwise it falls back to the local JSON file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
