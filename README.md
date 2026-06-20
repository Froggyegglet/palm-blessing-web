# Palm Blessing Web

Deployable MVP for the Palm Blessing kiosk.

The Android kiosk screen opens this website, captures a palm image, sends it to the backend, calls OpenAI, stores a reading, prints a receipt, and gives the customer a QR link to a mobile detail page.

## What Is Included

- Kiosk flow: start, A$5 payment placeholder, palm scan, AI analysis, receipt preview
- Mobile detail page: `/?reading=SYD-xxxxxx`
- Bilingual UI: English and Chinese
- OpenAI backend call with the API key kept server-side
- Per-reading JSON storage and palm image storage
- Real QR endpoint: `/api/readings/:id/qr.svg`
- Render-ready config with persistent disk

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

Open:

```text
http://127.0.0.1:4173
```

On the same Wi-Fi, the Android kiosk can open your computer LAN IP:

```text
http://YOUR-LAN-IP:4173
```

For production, use a real domain with HTTPS.

## Deploy To Render

1. Create a new GitHub repo with this folder.
2. Push the code.
3. In Render, create a new Blueprint or Web Service.
4. Use `render.yaml`, or set manually:

```text
Build command: npm install
Start command: npm start
```

5. Add environment variables:

```text
OPENAI_API_KEY=your key
OPENAI_MODEL=gpt-4.1-mini
HOST=0.0.0.0
PALM_BLESSING_DATA_DIR=/var/data/palm-blessing
MAX_BODY_BYTES=8388608
```

6. Add a persistent disk:

```text
Mount path: /var/data
Size: 1 GB
```

After deployment:

```text
Kiosk URL: https://your-domain.com
Reading URL: https://your-domain.com/?reading=SYD-0620-XXXXXX
```

## Production Notes

- Do not put `OPENAI_API_KEY` in frontend code.
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

- Move readings/images to Supabase or S3 instead of local disk.
- Add admin dashboard for shop/device analytics.
- Connect real payment callback.
- Connect Android printer SDK.
- Generate a dedicated share card image for Instagram/TikTok.

