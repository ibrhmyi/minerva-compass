# Minerva Compass — Architectural Decisions

## Decision 001: Product Focus — AI Admissions Chatbot
**Date**: 2026-03-28
**Context**: The project goal was "Create a web app to support applicants in applying to Minerva University OR helping the admissions team in processing applicant information." Multiple ideas were considered.
**Decision**: Build an AI-powered admissions chatbot rather than a standalone tool (e.g., accomplishment builder, checklist tracker).
**Rationale**: Research showed the #1-4 applicant concerns (cost, eligibility, process, differentiation) are all FAQ-type questions best served by a conversational AI. A chatbot covers the full applicant journey from awareness to decision. Accomplishment guidance can live naturally inside the chatbot. Proven model at other universities (Georgia State's Pounce: 200K messages, <1% needing human follow-up).

## Decision 002: xAI Grok as AI Backend (SUPERSEDED by Decision 007)
**Date**: 2026-03-28
**Context**: Needed an LLM API that is free or very low cost.
**Decision**: Use xAI Grok 3 Mini Fast via their OpenAI-compatible API.
**Rationale**: $25 free credits on signup, extremely low token pricing ($0.20/M input, $0.50/M output), OpenAI-compatible format simplifies integration, fast response times.
**Status**: SUPERSEDED — switched to Groq (Llama 3.3 70B), then to Google Gemini 2.0 Flash. See Decision 007.

## Decision 003: Vercel Serverless for API Proxy
**Date**: 2026-03-28
**Context**: Need to call AI API without exposing API key in frontend code.
**Decision**: Use Vercel serverless function as API proxy, storing key as environment variable.
**Rationale**: Keeps API key secure server-side. Vercel free tier is sufficient. Single function keeps architecture simple. No separate backend to manage.

## Decision 004: Vanilla Stack (No Frameworks)
**Date**: 2026-03-28
**Context**: Template requires vanilla HTML/CSS/JS.
**Decision**: Pure HTML, CSS, and JavaScript with no build tools or frameworks.
**Rationale**: Matches template requirements, zero build complexity, faster page loads, easier for other APs to understand and modify.

## Decision 005: Knowledge Base in System Prompt
**Date**: 2026-03-28
**Context**: Need to ground the AI's responses in verified Minerva information.
**Decision**: Embed the complete knowledge base directly in the system prompt rather than using RAG or external database.
**Rationale**: Simpler architecture, no vector DB needed, Grok's context window handles it, ensures every response is grounded in the same verified information. Knowledge base compiled from official Minerva pages: FAQ, admissions, financial aid, curriculum, student life.

## Decision 006: Zero Server-Side Data Storage
**Date**: 2026-03-28 (updated 2026-04-05)
**Context**: Guardrails require strict data privacy (no PII, no student records).
**Decision**: Store no data on any server. No database, no cookies, no server-side analytics. Conversation persists in browser localStorage only for user convenience — cleared on "New conversation" and never sent to any server.
**Rationale**: Maximum privacy compliance. Simple architecture. No server-side data = no risk. localStorage is user-local only and respects zero-server-storage principle. Aligns with both staff and student AI guardrails frameworks.

## Decision 007: Google Gemini 2.0 Flash as AI Backend
**Date**: 2026-04-05
**Context**: Groq free tier had severe daily token limits causing mid-conversation context loss. The 46KB system prompt plus 20 messages of context burned through limits fast.
**Decision**: Switch from Groq (Llama 3.3 70B) to Google Gemini 2.0 Flash via the Generative AI API.
**Rationale**: Gemini free tier offers 15 requests/minute, 1 million tokens/day, 1500 requests/day — massively more generous than Groq. Excellent quality for factual Q&A. Streaming support via SSE. 1M token context window handles the full knowledge base easily.

## Decision 008: Streaming Responses via Server-Sent Events
**Date**: 2026-04-05
**Context**: Users waited 3-8 seconds staring at a typing indicator before seeing the full response. Poor UX.
**Decision**: Implement real-time streaming — words appear as generated. Vercel Edge Function forwards Gemini's SSE stream to the client.
**Rationale**: Modern chatbots all stream. Feels 5-10x faster even though total generation time is similar. Edge Runtime has zero cold-start and native streaming support.

## Decision 009: Comprehensive minerva.edu Rescrape
**Date**: 2026-04-05
**Context**: Knowledge base was compiled March 31, 2026 and already had stale links (financial aid URLs changed, site restructured from /admissions/ to /undergraduate/admissions).
**Decision**: Rescrape all key pages from minerva.edu including about, admissions, financial aid, tuition, curriculum, majors, minors, student life, career development, outcomes, graduate programs, FAQs, and accreditation.
**Rationale**: Minerva restructured their website URLs. Old links were returning 404s. Fresh scrape ensures all links are correct and information is current. Knowledge base now includes Financial Aid Center link, executive education, and more detailed FAQ content.

## Decision 010: PWA + localStorage Persistence
**Date**: 2026-04-05
**Context**: Conversations were lost on page refresh. Many applicants are on mobile phones in various timezones.
**Decision**: Add Progressive Web App support (manifest.json + service worker) and localStorage conversation persistence.
**Rationale**: PWA allows "installing" the app on mobile for quick access. Service worker caches static shell for faster loads. localStorage preserves conversations across sessions without any server-side storage. Max 50 messages stored to respect storage limits.
