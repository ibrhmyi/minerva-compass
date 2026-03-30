# Minerva Compass

**AI-powered admissions assistant for Minerva University.**

Minerva Compass helps prospective students get instant, accurate answers about Minerva University's admissions process, curriculum, student life, financial aid, and more. Available 24/7, in any language.

**Live:** [minerva-compass.vercel.app](https://minerva-compass.vercel.app)

## How It Works

Minerva Compass uses a Gemini-powered AI model pre-loaded with Minerva University's complete public knowledge base, compiled from minerva.edu. It answers only from verified, published information and cites its sources. If it doesn't know something, it directs users to admissions@minerva.edu.

## Features

### Chat
- Real-time streaming responses with multi-model fallback (Gemini 2.5 Flash Lite > 2.0 Flash Lite > 2.5 Flash)
- Multi-conversation history with localStorage persistence
- Multilingual support (auto-detects user language)
- Time-aware quick questions based on admission cycle deadlines
- Source citations linking back to minerva.edu
- AI-generated follow-up question suggestions
- Pre-chat survey to segment users by journey stage (exploring, applying, admitted, parent)
- Proactive idle nudge after 30s of inactivity
- Email capture for admissions lead generation
- Response time indicator
- Mobile-first responsive design

### Admin Dashboard (`/admin.html`)
- **Overview:** Total questions, daily count, sessions, feedback (positive/negative), flagged conversations, emails captured, and user journey stage breakdown
- **Sessions:** Full conversation transcripts with flagged message highlighting, user journey stage badges, and filtering by flagged status
- **Feedback:** Compact list with click-to-expand full question and answer text
- **Emails:** Captured leads with CSV export
- **Charts:** 14-day question trends and popular topic breakdown

### Embeddable Widget
Drop Minerva Compass into any webpage with a single script tag:
```html
<script src="https://minerva-compass.vercel.app/embed/widget.js"></script>
```

### Analytics
- Topic classification across 12 categories (application, financial aid, deadlines, enrollment, curriculum, student life, careers, accomplishments, challenges, transfer, about Minerva, visa/international)
- Server-side session recording with auto-flagging (detects uncertain responses)
- User-facing flag button for reporting bad responses
- Per-message flag tracking visible in admin session detail

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend:** Vercel Edge Functions (streaming API proxy)
- **AI:** Google Gemini API with multi-model fallback
- **Storage:** Vercel KV (Upstash Redis) for analytics, sessions, feedback, and email capture
- **Knowledge Base:** Compiled from minerva.edu (last updated April 5, 2026)
- **Hosting:** Vercel

## Setup

### 1. Clone
```bash
git clone https://github.com/ibrhmyi/minerva-compass.git
cd minerva-compass
```

### 2. Environment Variables
Set in Vercel dashboard or create a `.env` file:
```
GEMINI_API_KEY=your_gemini_api_key
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token
ADMIN_TOKEN=your_admin_password
```

Get a Gemini API key at [aistudio.google.com](https://aistudio.google.com/).

### 3. Vercel KV
1. Go to your Vercel project dashboard
2. Navigate to Storage > Create Database > KV
3. Link it to your project (auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`)

### 4. Deploy
```bash
npx vercel --prod
```

## Project Structure

```
minerva-compass/
├── index.html              # Main chat interface
├── admin.html              # Admin dashboard
├── css/
│   ├── styles.css          # Chat UI styles (glass morphism design)
│   └── admin.css           # Admin dashboard styles
├── js/
│   ├── app.js              # Chat logic, streaming, history, surveys, email capture
│   └── admin.js            # Admin dashboard logic and rendering
├── api/
│   ├── _lib/kv.js          # Vercel KV REST API utility (shared)
│   ├── chat.js             # Gemini streaming proxy, knowledge base, topic detection
│   ├── feedback.js         # Feedback + stage tracking
│   ├── analytics.js        # Analytics API (admin-protected)
│   ├── emails.js           # Email capture (public POST) + listing (admin GET)
│   └── sessions.js         # Session recording + flagging
├── embed/
│   └── widget.js           # Embeddable chat widget (iframe-based)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── vercel.json             # Vercel routing and headers
└── package.json            # Project metadata
```

## License

Built for Minerva University admissions team.
