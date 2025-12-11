
import React from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

export type DemoStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface DemoOverlayProps {
  step: DemoStep;
  onNext: () => void;
  onExit: () => void;
  isAnalyzing: boolean;
}

export const DemoOverlay: React.FC<DemoOverlayProps> = ({ step, onNext, onExit, isAnalyzing }) => {
  if (step === 0) return null;

  const steps = [
    {
      title: "Step 1: Upload & Extract",
      capability: "Long Context + Structured JSON",
      description: "We are extracting structured data (materials, steps, controls) from the unstructured text using Gemini 3 Pro.",
      waiting: isAnalyzing
    },
    {
      title: "Step 2: Score & Analyze",
      capability: "Reasoning & Critique",
      description: "The model has reasoned through the protocol to calculate a reproducibility score and identify specific missing parameters. Review the Scorecard and Issues tabs.",
      waiting: false
    },
    {
      title: "Step 3: Deep Analysis Agents",
      capability: "Thinking + Search + Code",
      description: "Navigate to the Deep Analysis tab. Click 'Start Analysis Agents' to trigger parallel agents for virtual simulation, timeline estimation, and statistical critique.",
      waiting: false
    },
    {
      title: "Step 4: Visual Runbook",
      capability: "Image Generation (Gemini 3 Pro)",
      description: "Navigate to the Visuals tab. Select 'Pro High-Res' and click 'Generate Infographic' to create a visual summary.",
      waiting: false
    },
    {
      title: "Step 5: Standards Check",
      capability: "Grounding with Google Search",
      description: "Navigate to the Standards tab. Select a guideline (e.g., qPCR Reporting) and click 'Fetch Checklist' to search the web for official requirements, then compare them to your protocol.",
      waiting: false
    },
    {
      title: "Step 6: Export Report",
      capability: "Multimodal Handling",
      description: "Click 'Full Report' in the top right to download a combined report containing the analysis, citations, and the generated infographic.",
      waiting: false
    }
  ];

  const current = steps[step - 1];

  return (
    <div className="fixed bottom-8 right-8 z-50 w-96 bg-slate-900/95 text-white p-6 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700 animate-in slide-in-from-bottom-10 fade-in duration-300 font-sans">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-xs">
          <Sparkles className="w-4 h-4" /> Demo Script Mode
        </div>
        <button onClick={onExit} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <h3 className="text-xl font-bold mb-2 text-white">{current.title}</h3>
      <div className="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded text-xs font-mono mb-4">
        Feature: {current.capability}
      </div>
      
      <p className="text-slate-300 text-sm leading-relaxed mb-6">
        {current.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
           {[1, 2, 3, 4, 5, 6].map(i => (
             <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-indigo-500' : i < step ? 'bg-indigo-900' : 'bg-slate-700'}`} />
           ))}
        </div>

        <button 
          onClick={onNext}
          disabled={current.waiting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg
            ${current.waiting 
              ? 'bg-slate-700 text-slate-500 cursor-wait' 
              : 'bg-white text-slate-900 hover:bg-indigo-50'
            }`}
        >
          {current.waiting ? 'Processing...' : step === 6 ? 'Finish Demo' : 'Next Step'}
          {!current.waiting && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
