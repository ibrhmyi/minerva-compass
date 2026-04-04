# Minerva Compass

**An AI-powered admissions assistant for Minerva University applicants.**

Minerva Compass helps prospective students get instant, accurate answers about applying to Minerva University — admissions process, financial aid, student life, curriculum, deadlines, and more. Available 24/7, in any timezone.

## How It Works

Minerva Compass uses an AI model pre-loaded with Minerva University's complete public knowledge base, scraped and compiled from minerva.edu. It answers only from verified, published information. If it doesn't know something, it directs you to admissions@minerva.edu.

## Features

- **Streaming responses** — answers appear in real-time, word by word
- **Conversation memory** — chat persists across page refreshes via localStorage
- **Time-aware suggestions** — quick questions change based on the admissions cycle
- **Source citations** — each answer links back to the relevant minerva.edu page
- **Response feedback** — thumbs up/down to rate answer quality
- **Export conversations** — download your chat as a text file
- **PWA support** — installable on mobile, works with cached shell offline
- **Auto-retry** — automatic retry on failures with helpful fallback links
- **Mobile-first** — optimized for phones
- **Zero data collection** — no database, no cookies, no tracking

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Vercel Edge Function (streaming API proxy)
- **AI**: Gemini 2.0 Flash via Google Generative AI API
- **Knowledge Base**: Compiled from minerva.edu (last updated April 5, 2026)
- **Hosting**: Vercel

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/minerva-compass.git
cd minerva-compass
```

### 2. Set up environment variables
Create a `.env` file (or set in Vercel dashboard):
```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free API key at [aistudio.google.com](https://aistudio.google.com/).

### 3. Run locally
```bash
npx vercel dev
```

### 4. Deploy
```bash
npx vercel --prod
```

## Project Structure

```
minerva-compass/
├── index.html          # Main chat interface
├── css/styles.css      # Minerva-branded glass UI styling
├── js/app.js           # Chat logic, streaming, persistence, export
├── api/chat.js         # Vercel Edge Function (Gemini streaming proxy)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker for offline caching
├── icon.svg            # App icon (compass)
├── KNOWLEDGE_BASE.md   # Compiled Minerva knowledge base (source of truth)
├── vercel.json         # Vercel configuration
├── package.json        # Project metadata
├── GEMINI.md           # Project identity & context
├── DECISIONS.md        # Architectural decision log
└── README.md           # This file
```

## AI Guardrails Compliance

This project follows Minerva University's AI Guardrails:
- **AI-Assisted badge** displayed in the interface
- **Zero PII collection** — no data stored on any server
- **Transparent** — clearly identified as an AI assistant
- **Human-centered** — supports thinking, never decides for users
- **Grounded** — only answers from verified published information

## AI Disclosure

This project was developed with AI assistance (Claude by Anthropic). The AI served as a development partner for code generation, knowledge base compilation, and design decisions. All outputs were reviewed and directed by the human developer.

## License

Built for Minerva University's AP Side Project initiative.
