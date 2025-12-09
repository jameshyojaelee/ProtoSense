import React from 'react';
import { Check, Loader2, Circle } from 'lucide-react';

export type AnalysisStep = 'idle' | 'extracting' | 'scoring' | 'critiquing' | 'runbook' | 'patching' | 'complete';

interface AnalysisProgressProps {
  currentStep: AnalysisStep;
}

const steps: { id: AnalysisStep; label: string }[] = [
  { id: 'extracting', label: 'Extracting Protocol' },
  { id: 'scoring', label: 'Scoring Reproducibility' },
  { id: 'critiquing', label: 'Analyzing Gaps' },
  { id: 'runbook', label: 'Building Runbook' },
  { id: 'patching', label: 'Drafting Methods Patch' },
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ currentStep }) => {
  const getStepStatus = (stepId: AnalysisStep, index: number) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    // Determine the index of the current step in the sequence
    // If currentStep is 'complete', all are done.
    
    let activeIndex = currentIndex;
    if (currentStep === 'complete') activeIndex = steps.length;

    if (index < activeIndex) return 'completed';
    if (index === activeIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative">
        {/* Vertical line connector */}
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100" />

        <div className="space-y-6">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id, index);
            
            return (
              <div key={step.id} className="relative flex items-center gap-4">
                <div 
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500
                    ${status === 'completed' ? 'bg-indigo-600 border-indigo-600 text-white' : 
                      status === 'active' ? 'bg-white border-indigo-600 text-indigo-600 shadow-md' : 
                      'bg-white border-slate-200 text-slate-300'
                    }`}
                >
                  {status === 'completed' && <Check className="w-6 h-6" />}
                  {status === 'active' && <Loader2 className="w-6 h-6 animate-spin" />}
                  {status === 'pending' && <Circle className="w-6 h-6" />}
                </div>
                
                <div>
                  <h3 className={`text-sm font-medium transition-colors duration-300
                    ${status === 'pending' ? 'text-slate-400' : 'text-slate-800'}
                  `}>
                    {step.label}
                  </h3>
                  {status === 'active' && (
                    <p className="text-xs text-indigo-600 font-medium animate-pulse">Processing...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
