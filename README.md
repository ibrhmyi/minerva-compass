# Minerva Compass

**AI-powered admissions assistant for Minerva University applicants.**

Minerva Compass helps prospective students get instant, accurate answers about applying to Minerva University. Available 24/7, in any timezone.

## How It Works

Minerva Compass uses an AI model pre-loaded with Minerva University's complete public knowledge base, compiled from minerva.edu. It answers only from verified, published information. If it doesn't know something, it directs you to admissions@minerva.edu.

## Features

- Streaming responses in real-time
- Multi-conversation chat history with localStorage persistence
- Time-aware quick questions based on admission cycle deadlines
- Source citations linking back to minerva.edu
- Response feedback (thumbs up/down) logged for analytics
- Contextual follow-up suggestions generated per response
- PWA support (installable on mobile)
- Auto-retry on failures with fallback links
- Mobile-first design

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Vercel Edge Functions (streaming API proxy)
- **AI**: Gemini 3.1 Flash Lite via Google Generative AI API
- **Knowledge Base**: Compiled from minerva.edu (last updated April 5, 2026)
- **Hosting**: Vercel

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/ibrhmyi/minerva-compass.git
cd minerva-compass
```

### 2. Set up environment variables
Create a `.env` file (or set in Vercel dashboard):
```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free API key at [aistudio.google.com](https://aistudio.google.com/).

### 3. Deploy
```bash
npx vercel --prod
```

## Project Structure

```
minerva-compass/
├── index.html          # Main chat interface
├── css/styles.css      # Minerva-branded glass UI styling
├── js/app.js           # Chat logic, streaming, history, persistence
├── api/chat.js         # Vercel Edge Function (Gemini streaming proxy)
├── api/feedback.js     # Feedback logging endpoint
├── manifest.json       # PWA manifest
├── sw.js               # Service worker for offline caching
├── favicon.ico         # Minerva favicon
├── vercel.json         # Vercel configuration
└── package.json        # Project metadata
```

## License

Built for Minerva University admissions team.
