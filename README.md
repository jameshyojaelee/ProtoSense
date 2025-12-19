# ProtoSense

ProtoSense is a Gemini‑powered reproducibility copilot for biomedical methods. Upload a PDF or paste methods text and the app extracts a structured protocol, scores reproducibility (0–100), highlights missing parameters, and generates practical outputs like runbooks, methods patches, and visual diagrams.

## What it does
- Extracts structured protocol data (materials, steps, controls, QC, analysis).
- Scores reproducibility with dimension‑level subscores.
- Flags missing fields and ambiguities with fix suggestions.
- Generates a runbook checklist and a diff‑style methods patch.
- Runs deep analysis (timeline estimates, dilution math, virtual simulation, material validation, statistical critique).
- Produces visuals (runbook infographic + sketch‑to‑diagram cleanup).
- Benchmarks against reporting standards and shows coverage.
- Includes a protocol Q&A chat assistant and a demo mode.

## Tech stack
- React 19 + Vite
- TypeScript
- Tailwind (CDN)
- @google/genai
- Recharts
- lucide-react

## Run in Google AI Studio
This repo is configured as an AI Studio app. Open it here:
`https://ai.studio/apps/drive/1UOyWxFRhTvo4n6MFbRry1BonXTEbxn50?fullscreenApplet=true`

Notes:
- The “Pro High‑Res” visuals flow will prompt you to select a paid API key.
- AI Studio manages its own environment; you don’t need a local `.env`.

## Run locally
Prerequisites: Node.js

1. Install dependencies:
   `npm install`
2. Create `.env.local`:
   `GEMINI_API_KEY=your_key_here`
3. Start the dev server:
   `npm run dev`

The app runs at `http://localhost:3000`.

## Configuration
- `GEMINI_API_KEY`: Gemini API key used by the client.

## Security note
The API key is injected into the client bundle via Vite. This is fine for local/AI Studio usage, but **not** for a public production deployment. For production, move Gemini calls to a server and keep the key on the backend.

## Project layout
- `App.tsx`: main app orchestration and layout.
- `services/geminiService.ts`: all Gemini calls and schemas.
- `components/`: UI modules.
- `src/scoring/reproScore.ts`: scoring rubric.
- `types.ts`, `types/protocol.ts`: shared types.
