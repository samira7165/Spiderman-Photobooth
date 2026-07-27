# 🕷️ Spiderman AI Photobooth Backend

Backend system for a Spiderman-themed AI photobooth running in 4 halls simultaneously.

## Features

- **4 concurrent halls** — handles parallel requests from 4 locations
- **Queue system** — DB-based queue processes one image at a time
- **Dual AI APIs** — Gemini (primary) with OpenAI fallback
- **4 templates** — each with its own prompt and reference image
- **QR codes** — each generated photo gets a unique code + QR
- **Excel export** — download all user records as .xlsx
- **Auto-failover** — if Gemini fails, automatically tries OpenAI

## Quick Setup (15 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your API keys
cp .env.example .env
# Edit .env with your keys

# 3. Generate Prisma client & push schema to database
npx prisma generate
npx prisma db push

# 4. Run the dev server
npm run dev
```

## API Endpoints

### `POST /api/generate`
Submit a photo request from any hall.
```json
// Request body:
{ "name": "John", "phone": "01712345678", "hall": 1, "templateId": 2 }

// Response:
{ "requestId": "clx...", "position": 3, "message": "Photo request queued successfully" }
```

### `GET /api/status/[requestId]`
Poll for status (frontend calls every 3s).
```json
// Queued:   { "status": "queued", "position": 2 }
// Done:     { "status": "completed", "code": "SP-A1B2C3", "imageUrl": "...", "qrCodeUrl": "..." }
// Failed:   { "status": "failed", "error": "..." }
```

### `GET /api/templates` — Returns available templates
### `GET /api/images/[code]` — Returns photo data by code
### `GET /api/export` — Downloads Excel file of all records

## Public Viewer Page
`/view/[code]` — QR codes point here. Shows photo + download button.

## Customization
Edit `lib/templates.js` for prompts and reference images.
Put reference images in `/public/references/` as template-1.jpg through template-4.jpg.

## Deployment to Vercel
1. Push to GitHub
2. Connect to Vercel
3. Set env variables in Vercel dashboard
4. For Vercel Pro: maxDuration is already set to 60s in status route
