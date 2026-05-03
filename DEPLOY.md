# Deploying TipSplit

This doc walks through taking the current repo to production (Vercel or any Node host).

## 1. Environment configuration

Create an `.env` file (use `.env.example` as a template):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-or-service-key>
SUPABASE_TABLE=captures   # optional
NEXT_PUBLIC_BASE_URL=https://tipsplit.app
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=tipsplit.app
```

Leave `SUPABASE_*` blank to stick with local JSON storage (useful for preview builds).

## 2. Python / PDF prerequisites

The PDF export endpoint runs `scripts/render_pdf.py`. For local or self-hosted deployments:

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install reportlab   # Windows
# or
.venv/bin/python -m pip install reportlab           # macOS / Linux
```

Ensure the runtime has Python available. If deploying to Vercel, swap this for a serverless-friendly workflow (e.g., host the script on a separate worker or migrate to a pure JS PDF library).

## 3. Storage considerations

PDF exports currently save to `public/pdf/*.pdf` and are git-ignored. In production you should:

- Periodically clean this directory, **or**
- Upload generated PDFs to persistent object storage (S3, Supabase Storage, etc.) and serve from there.

Captures go to Supabase when env vars exist; otherwise they append to `data/captures.json`. When running in a serverless environment, prefer Supabase so you’re not relying on ephemeral disks.

## 4. Analytics

Plausible script is already loaded via `<Script>`. Create a site in Plausible and set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to match. The `data/dashboard.json` file lists suggested metrics/events.

Tracked events:

- `email_capture` (`tip_percent`, `people`)
- `download_pdf` (`tip_percent`, `people`)
- `share_link_copied` (`people`)

## 5. Build & run

```bash
npm install
npm run lint
npm run dev   # local
npm run build && npm run start   # production
```

## 6. Pre-flight checklist

- [ ] Supabase table created (default schema: email (text), bill_formatted (text), tip_percent (float), per_person_formatted (text), created_at (timestamptz), source (text)).
- [ ] Python/reportlab installed or alternative PDF generation wired.
- [ ] `public/og.png` generated (`.venv/Scripts/python.exe scripts/make_og.py`).
- [ ] Plausible site live and env var pointing to it.
- [ ] Robots/sitemap added if needed (currently unused).

Once these are satisfied, you can push to Vercel or any Node host confidently.
