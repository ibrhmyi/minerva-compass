# Minerva Compass

**An AI-powered admissions assistant for Minerva University applicants.**

Minerva Compass helps prospective students get instant, accurate answers about applying to Minerva University — admissions process, financial aid, student life, curriculum, deadlines, and more. Available 24/7, in any timezone.

## How It Works

Minerva Compass uses an AI model pre-loaded with Minerva University's complete public knowledge base, scraped and compiled from minerva.edu. It answers only from verified, published information. If it doesn't know something, it directs you to admissions@minerva.edu.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Vercel serverless function (API proxy)
- **AI**: Llama 3.3 70B via Groq
- **Knowledge Base**: Compiled from minerva.edu using Jina Reader (last updated March 31, 2026)
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
GROQ_API_KEY=your_groq_api_key_here
```

Get a free API key at [console.groq.com](https://console.groq.com).

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
├── css/styles.css      # Minerva-branded styling
├── js/app.js           # Chat logic and UI
├── api/chat.js         # Vercel serverless function (Groq API proxy)
├── KNOWLEDGE_BASE.md   # Compiled Minerva knowledge base (source of truth)
├── vercel.json         # Vercel configuration
├── package.json        # Project metadata
├── GEMINI.md           # Project identity & context
├── SCRATCHPAD.md       # Development session state
├── DECISIONS.md        # Architectural decision log
└── README.md           # This file
```

## AI Guardrails Compliance

This project follows Minerva University's AI Guardrails:
- **AI-Assisted badge** displayed in the interface
- **Zero PII collection** — no data stored anywhere
- **Transparent** — clearly identified as an AI assistant
- **Human-centered** — supports thinking, never decides for users
- **Grounded** — only answers from verified published information

## AI Disclosure

This project was developed with AI assistance (Claude by Anthropic). The AI served as a development partner for code generation, knowledge base compilation, and design decisions. All outputs were reviewed and directed by the human developer.

## License

Built for Minerva University's AP Side Project initiative.
