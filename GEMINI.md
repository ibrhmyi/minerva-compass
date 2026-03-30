# Minerva Compass — Project Identity

## Purpose
A single-sentence purpose: **Minerva Compass is an AI-powered admissions assistant that helps prospective Minerva University applicants get instant, accurate answers about the admissions process, financial aid, curriculum, student life, and more.**

## Audience
- **Primary**: Prospective Minerva University undergraduate applicants (ages 16-22, predominantly international, from 100+ countries)
- **Secondary**: Parents/guardians of prospective applicants, school counselors
- **Existing Knowledge**: Varying — from first-time hearers of Minerva to well-researched applicants
- **Goals**: Understand the application process, get specific answers to their questions, feel confident about applying

## Human Impact
What changes because this app exists: Applicants from any timezone, any country, at any hour can get accurate, supportive guidance about applying to Minerva University — without waiting for email responses or navigating a complex website. This is especially impactful for international applicants who may not have access to college counselors.

## Tech Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks, no build tools)
- **Backend**: Vercel Edge Function streaming proxy to Google Gemini API
- **AI**: Gemini 2.0 Flash via Google Generative AI API (free tier: 15 RPM, 1M tokens/day)
- **Hosting**: Vercel
- **Data**: No server-side database. Conversation persists in browser localStorage only.
- **Cost**: $0 (Gemini free tier)

## AI Integration
- Gemini 2.0 Flash model via Google Generative AI API
- Streaming responses (Server-Sent Events) for real-time display
- Comprehensive system prompt with verified Minerva University knowledge base (scraped April 5, 2026)
- Low temperature (0.3) for factual accuracy
- Source citations linking back to minerva.edu pages
- AI-Assisted badge displayed per Minerva guardrails requirements
- Transparent about being AI — never pretends to be human

## Values & Guardrails
This project adheres to both the Staff AI Guardrails and Student AI Guardrails Framework:
- **Human-Centered**: Supports applicant thinking and decision-making, never decides for them
- **Transparency**: AI badge displayed, disclosure in footer
- **Privacy**: Zero PII collection, no data storage, no tracking
- **Accuracy**: Only answers from verified published Minerva information
- **Accessibility**: WCAG AA compliant, keyboard navigable, screen reader compatible
- **Mobile-First**: Responsive from 375px minimum width

## Repository
- GitHub: [to be filled after repo creation]
- Live URL: [to be filled after Vercel deployment]
