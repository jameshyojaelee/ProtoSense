import React, { useState } from 'react';
import { GitPullRequest, Copy, Check } from 'lucide-react';

interface MethodsPatchProps {
  patchMarkdown?: string;
}

export const MethodsPatch: React.FC<MethodsPatchProps> = ({ patchMarkdown }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (patchMarkdown) {
      navigator.clipboard.writeText(patchMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderDiffLines = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="font-mono text-sm space-y-1">
        {lines.map((line, idx) => {
          let className = "px-3 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
          let prefix = "";
          
          if (line.trim().startsWith('+')) {
            className = "px-3 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-l-4 border-green-400 dark:border-green-600";
            prefix = "";
          } else if (line.trim().startsWith('-')) {
            className = "px-3 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-l-4 border-red-400 dark:border-red-600 opacity-80";
            prefix = "";
          } else if (line.trim().startsWith('~')) {
            className = "px-3 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-l-4 border-yellow-400 dark:border-yellow-600";
            prefix = "";
          } else if (line.trim().startsWith('#')) {
             return <h3 key={idx} className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">{line.replace(/^#+ /, '')}</h3>;
          }

          return (
            <div key={idx} className={className}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col animate-fade-in">
       <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Suggested Methods Patch
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Review specific additions and revisions to improve reproducibility.</p>
        </div>
        <button 
            onClick={handleCopy}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Copy Patch"
        >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 overflow-y-auto flex-1">
        {patchMarkdown ? (
            renderDiffLines(patchMarkdown)
        ) : (
             <div className="text-center py-20 text-slate-400">
                <p>Patch content is loading or unavailable.</p>
            </div>
        )}
      </div>
    </div>
  );
};