import React, { useState } from 'react';
import { Book, CheckCircle, XCircle, AlertCircle, Search, ArrowRight, ExternalLink, ShieldCheck, List, Scale } from 'lucide-react';
import { fetchReportingChecklist, compareProtocolToChecklist } from '../services/geminiService';
import { ProtocolExtraction } from '../types/protocol';
import { Checklist, ChecklistComparisonResult } from '../types';

interface StandardsPanelProps {
  extractionData: ProtocolExtraction;
}

const GUIDELINE_OPTIONS = [
  "qPCR Reporting (MIQE)",
  "Animal Experiments (ARRIVE)",
  "Sequencing Methods (MINSEQE)",
  "Microscopy Imaging",
  "Clinical Trials (CONSORT)",
  "Western Blotting",
  "Flow Cytometry (MIFlowCyt)"
];

export const StandardsPanel: React.FC<StandardsPanelProps> = ({ extractionData }) => {
  const [selectedGuideline, setSelectedGuideline] = useState(GUIDELINE_OPTIONS[0]);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [comparison, setComparison] = useState<ChecklistComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'idle' | 'fetching' | 'comparing'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFetchChecklist = async () => {
    setLoading(true);
    setLoadingStep('fetching');
    setError(null);
    setChecklist(null);
    setComparison(null);

    try {
      const result = await fetchReportingChecklist({ guidelineType: selectedGuideline });
      setChecklist(result);
    } catch (err: any) {
      setError(err.message || "Failed to fetch guideline.");
    } finally {
      setLoading(false);
      setLoadingStep('idle');
    }
  };

  const handleCompare = async () => {
    if (!checklist) return;
    setLoading(true);
    setLoadingStep('comparing');
    setError(null);

    try {
      const result = await compareProtocolToChecklist({
        checklistJson: checklist,
        extractionJson: extractionData
      });
      setComparison(result);
    } catch (err: any) {
      setError(err.message || "Failed to compare protocol.");
    } finally {
      setLoading(false);
      setLoadingStep('idle');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Covered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Partial': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'Missing': return <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />;
      default: return <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Standards Benchmark
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Compare your protocol against community reporting standards.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 h-full">
        {/* Left Control Panel */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Guideline Type</label>
            <div className="relative mb-4">
               <select 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={selectedGuideline}
                  onChange={(e) => setSelectedGuideline(e.target.value)}
                >
                  {GUIDELINE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
               </select>
            </div>
            
            <button
               onClick={handleFetchChecklist}
               disabled={loading}
               className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 mb-2 disabled:opacity-50"
            >
               {loadingStep === 'fetching' ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
               Fetch Checklist
            </button>
            
            {checklist && (
                <button
                    onClick={handleCompare}
                    disabled={loading}
                    className="w-full py-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loadingStep === 'comparing' ? <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /> : <Scale className="w-4 h-4" />}
                    Compare to My Methods
                </button>
            )}
            
            {error && (
               <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs rounded border border-red-100 dark:border-red-900/30">
                  {error}
               </div>
            )}
          </div>

          {checklist && checklist.citations.length > 0 && (
             <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                   <Book className="w-3 h-3" /> Sources
                </h4>
                <ul className="space-y-3">
                   {checklist.citations.map((cite, idx) => (
                      <li key={idx} className="text-xs">
                         <a href={cite.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-start gap-1">
                            <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{cite.title}</span>
                         </a>
                      </li>
                   ))}
                </ul>
             </div>
          )}
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-full">
            {!checklist ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-10">
                    <List className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select a guideline and click "Fetch Checklist" to begin.</p>
                </div>
            ) : !comparison ? (
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{checklist.checklistName}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Found {checklist.items.length} requirements</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {checklist.items.map((item) => (
                            <div key={item.id} className="p-4 border border-slate-100 dark:border-slate-700 rounded-lg">
                                <div className="flex justify-between mb-1">
                                    <span className="font-mono text-xs text-slate-400">{item.id}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.severity === 'Essential' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'}`}>
                                        {item.severity}
                                    </span>
                                </div>
                                <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">{item.requirement}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{item.whyItMatters}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                           Click "Compare to My Methods" to analyze. <ArrowRight className="w-4 h-4" />
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full">
                     <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Benchmark Results</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {comparison.items.filter(i => i.status === 'Covered').length} / {comparison.items.length} Requirements Met
                            </p>
                        </div>
                        <div className="flex gap-2 text-xs font-medium">
                            <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded border border-green-100 dark:border-green-800"><CheckCircle className="w-3 h-3" /> Covered</span>
                            <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded border border-orange-100 dark:border-orange-800"><AlertCircle className="w-3 h-3" /> Partial</span>
                            <span className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded border border-red-100 dark:border-red-800"><XCircle className="w-3 h-3" /> Missing</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                             <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 w-16">Status</th>
                                    <th className="px-6 py-3">Requirement</th>
                                    <th className="px-6 py-3">Evidence / Suggestion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {comparison.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <td className="px-6 py-4">
                                            {getStatusIcon(item.status)}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                                            {item.requirement}
                                            <div className="text-xs text-slate-400 mt-1 font-mono">{item.itemId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.status === 'Covered' ? (
                                                <div className="text-slate-600 dark:text-slate-400 text-xs italic bg-green-50/50 dark:bg-green-900/20 p-2 rounded border border-green-100 dark:border-green-900/30">
                                                    "{item.evidence}"
                                                </div>
                                            ) : (
                                                <div className="text-slate-600 dark:text-slate-400 text-xs">
                                                     {item.fixSuggestion && (
                                                         <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded mb-1">
                                                            <span className="font-bold">Fix: </span>{item.fixSuggestion}
                                                         </div>
                                                     )}
                                                     {item.evidence && <div className="italic opacity-70">Context: {item.evidence}</div>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};