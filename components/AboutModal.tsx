import React from 'react';
import { X, ShieldCheck, AlertTriangle, BookOpen, Github } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            About ProtoSense
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            <p>
              <strong>ProtoSense</strong> is an AI-powered assistant designed to evaluate scientific "Methods" sections for reproducibility. 
              It uses Google's latest <strong>Gemini 3 Pro</strong> model to score completeness, identify missing parameters, and generate actionable runbooks.
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg p-4 flex gap-3 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Limitations & Disclaimer</h4>
                <p className="text-xs opacity-90">
                  This tool is an <strong>assistant, not a guarantee</strong>. It may produce "hallucinations" or miss subtle scientific context. 
                  Always verify parameters, safety hazards, and calculations manually before performing experiments.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                How it works
              </h3>
              <ul className="list-disc pl-5 space-y-1 marker:text-indigo-300 dark:marker:text-indigo-600">
                <li>Extracts structured data (reagents, steps, controls).</li>
                <li>Calculates a reproducibility score based on parameter completeness.</li>
                <li>Identifies ambiguities and suggests specific fixes.</li>
                <li>Converts prose into a step-by-step checklist (Runbook).</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};