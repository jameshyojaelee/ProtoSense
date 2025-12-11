
import React, { useState } from 'react';
import { Calculator, Clock, AlertTriangle, Beaker, PlayCircle, Bot, Search, Check, X, HelpCircle, Activity } from 'lucide-react';
import { ConsistencyCheckResult, DeepAnalysisResult } from '../types';

interface ConsistencyPanelProps {
  data: ConsistencyCheckResult | undefined;
  deepData?: DeepAnalysisResult;
  isLoading: boolean;
  onRunChecks: () => void;
}

export const ConsistencyPanel: React.FC<ConsistencyPanelProps> = ({ data, deepData, isLoading, onRunChecks }) => {
  const [activeSubTab, setActiveSubTab] = useState<'consistency' | 'simulation' | 'validation'>('consistency');

  if (!data && !deepData && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-full mb-6">
            <Activity className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Run Deep Analysis</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
            Perform computational consistency checks, virtual robot simulation, and material search validation.
        </p>
        <button
            onClick={onRunChecks}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors flex items-center gap-2"
        >
            <PlayCircle className="w-5 h-5" />
            Start Analysis Agents
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="relative w-16 h-16 mb-4">
             <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
             <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 dark:border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
         </div>
         <p className="text-slate-600 dark:text-slate-400 font-medium">Running Agentic Workflow...</p>
         <div className="mt-2 space-y-1 text-xs text-slate-400">
            <p>• Estimating Timelines (Python)</p>
            <p>• Simulating Protocol Steps (Gemini Thinking)</p>
            <p>• Validating Materials (Google Search)</p>
         </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Sub-navigation */}
      <div className="flex justify-center mb-6">
        <div className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 flex gap-1">
            <button
                onClick={() => setActiveSubTab('consistency')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeSubTab === 'consistency' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
                Timeline & Math
            </button>
            <button
                onClick={() => setActiveSubTab('simulation')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeSubTab === 'simulation' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
                Virtual Simulation
            </button>
            <button
                onClick={() => setActiveSubTab('validation')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeSubTab === 'validation' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
                Material Validation
            </button>
        </div>
      </div>

      {activeSubTab === 'consistency' && data && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid md:grid-cols-2 gap-8">
                {/* Timeline */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Estimated Timeline</h3>
                    </div>
                    <div className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                        {data.timeline_minutes_estimate > 0 
                            ? `${Math.floor(data.timeline_minutes_estimate / 60)}h ${data.timeline_minutes_estimate % 60}m`
                            : "Unknown"
                        }
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {data.timeline_explanation}
                    </p>
                </div>

                {/* Inconsistencies */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Flagged Inconsistencies</h3>
                    </div>
                    {data.flagged_inconsistencies.length > 0 ? (
                        <ul className="space-y-2">
                            {data.flagged_inconsistencies.map((item, idx) => (
                                <li key={idx} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <span className="text-red-500">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400 text-sm">No obvious inconsistencies detected.</p>
                    )}
                </div>
            </div>

            {/* Dilutions */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <Beaker className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Computed Dilutions</h3>
                </div>
                {data.computed_dilutions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3">Reagent</th>
                                    <th className="px-6 py-3">Calculation</th>
                                    <th className="px-6 py-3">Instruction</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {data.computed_dilutions.map((row, idx) => (
                                    <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{row.reagent}</td>
                                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400 text-xs">{row.calculation}</td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{row.instruction}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No implicit dilution steps identified.
                    </div>
                )}
            </div>
        </div>
      )}

      {activeSubTab === 'simulation' && deepData && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
             <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                         <h3 className="font-bold text-slate-800 dark:text-slate-200">Virtual Robot Simulation</h3>
                         <p className="text-xs text-slate-500">Gemini 3 Pro "Thinking" Trace</p>
                    </div>
                </div>
            </div>
            <div className="p-0">
                {deepData.simulation_logs.map((log, idx) => (
                    <div key={idx} className={`p-4 border-b border-slate-100 dark:border-slate-800 flex gap-4 ${
                        log.status === 'Critical Failure' ? 'bg-red-50/50 dark:bg-red-900/10' : 
                        log.status === 'Warning' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                    }`}>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-500">
                            {log.stepId}
                        </div>
                        <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    log.status === 'Success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                    log.status === 'Warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                }`}>
                                    {log.status}
                                </span>
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{log.action}</span>
                             </div>
                             <div className="text-sm text-slate-600 dark:text-slate-300 font-mono mb-1">
                                <span className="text-indigo-500">Thinking:</span> {log.simulation_note}
                             </div>
                             <div className="text-xs text-slate-400 italic">
                                State: {log.state_change}
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeSubTab === 'validation' && deepData && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-lg text-cyan-600 dark:text-cyan-400">
                        <Search className="w-5 h-5" />
                    </div>
                    <div>
                         <h3 className="font-bold text-slate-800 dark:text-slate-200">Reagent & Equipment Validation</h3>
                         <p className="text-xs text-slate-500">Google Search Verification</p>
                    </div>
                </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {deepData.material_validations.length > 0 ? deepData.material_validations.map((mat, idx) => (
                     <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="mt-1">
                            {mat.status === 'Verified' && <Check className="w-5 h-5 text-green-500" />}
                            {mat.status === 'Not Found' && <X className="w-5 h-5 text-red-500" />}
                            {mat.status === 'Discontinued' && <AlertTriangle className="w-5 h-5 text-orange-500" />}
                            {mat.status === 'Ambiguous' && <HelpCircle className="w-5 h-5 text-slate-400" />}
                        </div>
                        <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                                {mat.material_name}
                                {mat.catalog_number && <span className="ml-2 text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{mat.catalog_number}</span>}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {mat.search_finding}
                            </p>
                        </div>
                     </div>
                )) : (
                    <div className="p-8 text-center text-slate-400">No major reagents identified for validation.</div>
                )}
            </div>
          </div>
      )}
    </div>
  );
};
