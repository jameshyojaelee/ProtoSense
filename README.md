<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Overview

ProtoSense is a Gemini 3–powered multi-agent reproducibility copilot for biomedical methods (experimental protocols). Scientists can upload a PDF or paste their methods; ProtoSense uses Gemini 3 Pro to extract a structured protocol (materials, steps, controls, QC checks, analysis settings), then applies a custom rubric to produce a 0–100 reproducibility score with dimension-level subscores and the top missing fields or ambiguities most likely to block replication.

Above this extraction layer, ProtoSense orchestrates specialized agents: a critique agent that proposes concrete clarification questions; a runbook generator that turns the protocol into an executable checklist; a methods “patch” writer for precise text additions; a standards agent that benchmarks against community reporting guidelines; a virtual laboratory simulator that “mentally executes” steps and logs contradictions or missing parameters; a reagent validator that searches vendors/catalog numbers for plausibility; a statistician agent that audits sample size, replicates, and statistical tests; and a visuals module (using Nano Banana/Gemini image models) that turns protocols and sketches into infographic-style diagrams.

ProtoSense is designed for wet-lab scientists, reviewers, and journal editors who need fast, conservative checks on whether an experiment can actually be reproduced. By surfacing missing parameters, weak controls, implausible reagents, and unclear analysis before experiments are run or manuscripts are submitted, it aims to reduce wasted resources and strengthen trust in published results.

# Run and deploy this AI Studio app
This repo contains everything you need to run your app locally. For the local run, you need your own Gemini API
View app in AI Studio: https://ai.studio/apps/drive/1UOyWxFRhTvo4n6MFbRry1BonXTEbxn50?fullscreenApplet=true

## Run Locally
**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
