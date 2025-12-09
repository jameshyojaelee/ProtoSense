import React from 'react';
import { Calculator, Clock, AlertTriangle, Beaker } from 'lucide-react';
import { ConsistencyCheckResult } from '../types';

interface ConsistencyPanelProps {
  data: ConsistencyCheckResult | undefined;
  isLoading: boolean;
  onRunChecks: () => void;
}

export const ConsistencyPanel: React.FC<ConsistencyPanelProps> = ({ data, isLoading, onRunChecks }) => {
  if (!data && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-full mb-6">
            <Calculator className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Run Consistency Checks</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
            Use code execution to estimate the total timeline, flag unit inconsistencies, and calculate implied dilutions.
        </p>
        <button
            onClick={onRunChecks}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors flex items-center gap-2"
        >
            <Calculator className="w-5 h-5" />
            Run Checks
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
         <p className="text-slate-600 dark:text-slate-400 font-medium">Running Python computations...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-lg flex gap-3 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p>These results are best-effort computations based on extracted text. Always verify calculations manually.</p>
      </div>

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
  );
};