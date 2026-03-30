# Minerva Compass — Architectural Decisions

## Decision 001: Product Focus — AI Admissions Chatbot
**Date**: 2026-03-28
**Context**: The project goal was "Create a web app to support applicants in applying to Minerva University OR helping the admissions team in processing applicant information." Multiple ideas were considered.
**Decision**: Build an AI-powered admissions chatbot rather than a standalone tool (e.g., accomplishment builder, checklist tracker).
**Rationale**: Research showed the #1-4 applicant concerns (cost, eligibility, process, differentiation) are all FAQ-type questions best served by a conversational AI. A chatbot covers the full applicant journey from awareness to decision. Accomplishment guidance can live naturally inside the chatbot. Proven model at other universities (Georgia State's Pounce: 200K messages, <1% needing human follow-up).

## Decision 002: xAI Grok as AI Backend
**Date**: 2026-03-28
**Context**: Needed an LLM API that is free or very low cost.
**Decision**: Use xAI Grok 3 Mini Fast via their OpenAI-compatible API.
**Rationale**: $25 free credits on signup, extremely low token pricing ($0.20/M input, $0.50/M output), OpenAI-compatible format simplifies integration, fast response times.

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

## Decision 006: Zero Data Storage
**Date**: 2026-03-28
**Context**: Guardrails require strict data privacy (no PII, no student records).
**Decision**: Store absolutely nothing. No database, no localStorage, no cookies, no analytics. Conversation exists only in browser memory and is lost on page refresh.
**Rationale**: Maximum privacy compliance. Simplest architecture. No data = no risk. Aligns with both staff and student AI guardrails frameworks.
