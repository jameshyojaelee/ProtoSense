import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { ReproScore } from '../types/protocol';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ScorecardProps {
  score: ReproScore;
}

export const Scorecard: React.FC<ScorecardProps> = ({ score }) => {
  const getScoreColor = (value: number) => {
    if (value >= 80) return '#22c55e'; // Green
    if (value >= 50) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const subScoresData = [
    { category: 'Materials', score: score.subscores.materials },
    { category: 'Parameters', score: score.subscores.parameters },
    { category: 'Controls', score: score.subscores.controls },
    { category: 'QC Checks', score: score.subscores.qc },
    { category: 'Analysis', score: score.subscores.analysis },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col md:flex-row items-center gap-10">
        
        {/* Overall Score Circle */}
        <div className="relative flex-shrink-0 w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="#f1f5f9"
              className="dark:stroke-slate-800"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke={getScoreColor(score.total)}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 88}
              strokeDashoffset={2 * Math.PI * 88 * (1 - score.total / 100)}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-slate-800 dark:text-slate-100">{score.total}</span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">Reproducibility</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Assessment Summary</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            {score.total < 50 
              ? "This protocol significantly lacks the necessary detail for reproduction. Key identifiers for materials and quantitative parameters are missing." 
              : score.total < 80 
                ? "This protocol is robust but contains ambiguities. While many steps are clear, specific controls or analysis versions may be missing."
                : "Excellent protocol. High clarity, specific reagents, and clear controls make this suitable for immediate replication."}
          </p>
           
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    {score.subscores.ambiguityPenalty} 
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">pts</span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Ambiguity Penalty</div>
             </div>
             <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-xl font-bold text-red-500 dark:text-red-400">
                    {score.topIssues.filter(i => i.severity === 'blocker').length}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Critical Blockers</div>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sub-scores Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Detailed Scoring</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={subScoresData}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="category" type="category" width={100} tick={{fontSize: 12, fontWeight: 500, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: 'rgba(148, 163, 184, 0.1)'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                  {subScoresData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-xs text-slate-400 text-center">
             Scores based on presence of identifiers, parameter completeness, and quality controls.
          </div>
        </div>
        
        {/* Top Issues */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center justify-between">
                Top Reproducibility Issues
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Priority Fixes</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {score.topIssues.map((issue, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="mt-0.5">
                            {issue.severity === 'blocker' && <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                            {issue.severity === 'major' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                            {issue.severity === 'minor' && <Info className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight mb-1">
                                {issue.title}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {issue.details}
                            </p>
                        </div>
                    </div>
                ))}
                {score.topIssues.length === 0 && (
                     <div className="text-center py-10 text-slate-400">
                        <p>No critical issues found.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};