import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, HelpCircle, Lightbulb, ClipboardList, Sparkles } from 'lucide-react';
import { AnalysisResult, Issue, Severity } from '../types';

interface IssuesListProps {
  issues: Issue[];
  summary: string;
  critique?: AnalysisResult['critique'];
  isDemoMode?: boolean;
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues, summary, critique, isDemoMode = false }) => {
  const getSeverityIcon = (severity: Severity | string) => {
    switch (severity.toLowerCase()) {
      case 'blocker': return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'major': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'minor': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityBg = (severity: Severity | string) => {
    switch (severity.toLowerCase()) {
      case 'blocker': return 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50';
      case 'major': return 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/50';
      case 'minor': return 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50';
      default: return 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700';
    }
  };

  const getSeverityLabel = (severity: Severity | string) => {
    switch (severity.toLowerCase()) {
      case 'blocker': return 'text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'major': return 'text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'minor': return 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const sortedIssues = [...issues].sort((a, b) => {
    const weights = { Blocker: 3, Major: 2, Minor: 1 };
    return weights[b.severity] - weights[a.severity];
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Methods Patch Summary */}
      <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-bold text-indigo-900 dark:text-indigo-200 mb-3">
            <CheckCircle2 className="w-5 h-5" />
            Analysis Summary
        </h3>
        <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed text-sm md:text-base">
            {summary}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Extracted Issues */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            Missing Data
            {issues.length > 0 && (
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-bold">{issues.length}</span>
            )}
          </h3>
          {sortedIssues.map((issue, idx) => {
            const isMarquee = isDemoMode && idx < 3; // Highlight top 3 in demo mode
            return (
                <div key={idx} className={`p-4 rounded-xl border transition-all hover:shadow-md 
                    ${getSeverityBg(issue.severity)}
                    ${isMarquee ? 'ring-2 ring-indigo-400 ring-offset-1 animate-pulse-subtle' : ''}
                `}>
                <div className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0">
                    {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border bg-opacity-80 
                                ${getSeverityLabel(issue.severity)}`}>
                                {issue.severity}
                            </span>
                         </div>
                         {isMarquee && (
                             <span className="text-[10px] flex items-center gap-1 text-indigo-600 dark:text-indigo-300 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                                <Sparkles className="w-3 h-3" /> Demo Highlight
                             </span>
                         )}
                    </div>
                    
                    <h4 className="text-slate-800 dark:text-slate-200 font-medium text-sm mb-2">{issue.description}</h4>
                    
                    {issue.evidence_quote && (
                        <div className="mb-2 p-2 bg-white dark:bg-slate-900/60 bg-opacity-60 rounded border border-slate-200/50 dark:border-slate-700 italic text-slate-600 dark:text-slate-400 text-xs border-l-4 border-l-slate-300 dark:border-l-slate-600">
                            "{issue.evidence_quote}"
                        </div>
                    )}

                    <div className="mt-3 text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-slate-100">Recommended Fix: </span>
                        {issue.fix_suggestion}
                    </div>
                    </div>
                </div>
                </div>
            );
          })}
          {issues.length === 0 && (
              <div className="text-center py-12 px-6 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                  <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">No structured data gaps found.</p>
                  <p className="text-xs text-slate-400 mt-1">The extraction didn't identify specific missing fields defined in the schema.</p>
              </div>
          )}
        </div>

        {/* AI Critique Section */}
        <div className="space-y-4">
           <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
             AI Critique
             <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">Gemini 3 Pro</span>
           </h3>
           
           {critique ? (
             <>
               {critique.prioritized_questions.map((q, idx) => (
                 <div key={`q-${idx}`} className={`p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-full text-purple-600 dark:text-purple-300 flex-shrink-0">
                           <HelpCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border 
                                    ${getSeverityLabel(q.severity)} bg-slate-50 dark:bg-slate-800`}>
                                    {q.severity} Question
                                </span>
                            </div>
                            <h4 className="text-slate-800 dark:text-slate-200 font-medium text-sm">{q.question}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{q.rationale}</p>
                        </div>
                    </div>
                 </div>
               ))}

               {critique.suggested_fixes.map((f, idx) => (
                 <div key={`f-${idx}`} className={`p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 hover:shadow-md transition-shadow`}>
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-full text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                           <Lightbulb className="w-4 h-4" />
                        </div>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900`}>
                                    Suggestion
                                </span>
                            </div>
                            <h4 className="text-emerald-900 dark:text-emerald-200 font-medium text-sm">{f.fix_text}</h4>
                            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 leading-relaxed">{f.rationale}</p>
                        </div>
                    </div>
                 </div>
               ))}

               {critique.prioritized_questions.length === 0 && critique.suggested_fixes.length === 0 && (
                  <div className="text-center py-12 px-6 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                    <ClipboardList className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No specific critique points.</p>
                    <p className="text-xs text-slate-400 mt-1">The model didn't flag qualitative issues.</p>
                  </div>
               )}
             </>
           ) : (
             <div className="text-center py-12 px-6 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                 <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full w-10 h-10 mb-3"></div>
                <p>Generating critique...</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};