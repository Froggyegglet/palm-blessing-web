# Palm Blessing Web

Deployable MVP for the Palm Blessing kiosk.

The Android kiosk screen opens this website, captures a palm image, sends it to the backend, calls OpenAI, stores a reading, prints a receipt, and gives the customer a QR link to a mobile detail page.

## What Is Included

- Kiosk flow: start, A$5 payment placeholder, palm scan, AI analysis, receipt preview
- Mobile detail page: `/?reading=SYD-xxxxxx`
- Bilingual UI: English and Chinese
- OpenAI backend call with the API key kept server-side
- Supabase-backed reading storage and private palm image storage for production
- Real QR endpoint: `/api/readings/:id/qr.svg`
- Vercel-ready config with serverless API functions

## Local Setup

```bash
npm install
cp .env.example .env
npm start
```

Set this in `.env`:

```bash
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4.1-mini
PORT=4173
HOST=0.0.0.0
PALM_BLESSING_DATA_DIR=.data
```

For a local production-like run, also set:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-side-supabase-key
SUPABASE_STORAGE_BUCKET=palm-scans
SUPABASE_TABLE=palm_readings
```

If Supabase is not configured locally, the app falls back to `.data` file storage.

Open:

```text
http://127.0.0.1:4173
```

On the same Wi-Fi, the Android kiosk can open your computer LAN IP:

```text
http://YOUR-LAN-IP:4173
```

For production, use a real domain with HTTPS.

## Deploy To Vercel

1. Create a new GitHub repo with this folder.
2. Push the code.
3. In Vercel, import the GitHub repo.
4. Add environment variables:

```text
OPENAI_API_KEY=your key
OPENAI_MODEL=gpt-4.1-mini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your server-side key
SUPABASE_STORAGE_BUCKET=palm-scans
SUPABASE_TABLE=palm_readings
MAX_BODY_BYTES=8388608
```

After deployment:

```text
Kiosk URL: https://your-domain.com
Reading URL: https://your-domain.com/?reading=SYD-0620-XXXXXX
```

## Production Notes

- Do not put `OPENAI_API_KEY` in frontend code.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Use HTTPS for camera access on phones and Android Chrome.
- For a real kiosk, Android should run Chrome kiosk mode or a WebView shell pointed at the production URL.
- Thermal printing should be handled by the Android native shell through printer SDK or JS bridge.
- Card payment should be handled through Square, Stripe Terminal, or local card reader SDK. After payment succeeds, call:

```http
POST /api/readings/:id/payment-success
```

## API

```http
GET /api/health
POST /api/readings
POST /api/readings/:id/payment-success
POST /api/readings/:id/scan
GET /api/readings/:id
GET /api/readings/:id/image
GET /api/readings/:id/qr.svg
POST /api/readings/:id/print
```

## What To Upgrade After MVP

- Add admin dashboard for shop/device analytics.
- Connect real payment callback.
- Connect Android printer SDK.
- Generate a dedicated share card image for Instagram/TikTok.
