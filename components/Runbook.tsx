import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, FileText, Edit2, Save, X } from 'lucide-react';
import { RunbookStep } from '../types';

interface RunbookProps {
  runbook: RunbookStep[];
  markdownContent?: string;
  onExport: () => void;
  onUpdate?: (newMarkdown: string) => void;
}

export const Runbook: React.FC<RunbookProps> = ({ runbook, markdownContent, onExport, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Sync edit content when markdownContent changes
  useEffect(() => {
    if (markdownContent) {
      setEditContent(markdownContent);
    }
  }, [markdownContent]);

  const handleCopy = () => {
    if (markdownContent) {
      navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (markdownContent) {
      setEditContent(markdownContent);
    }
    setIsEditing(false);
  };

  const SimpleMarkdownRenderer = ({ content }: { content: string }) => {
    const lines = content.split('\n');
    return (
      <div className="font-sans text-slate-800 dark:text-slate-200 leading-relaxed space-y-2">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('# ')) return <h1 key={idx} className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-8 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">{line.replace('# ', '')}</h1>;
          if (line.startsWith('## ')) return <h2 key={idx} className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-6 mb-3 flex items-center gap-2">{line.replace('## ', '')}</h2>;
          if (line.startsWith('### ')) return <h3 key={idx} className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">{line.replace('### ', '')}</h3>;
          
          // Lists
          if (line.trim().startsWith('- ')) {
             const text = line.trim().replace('- ', '');
             // Basic bold parsing
             const parts = text.split(/(\*\*.*?\*\*)/g);
             return (
                <div key={idx} className="flex items-start gap-2 ml-4">
                    <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 flex-shrink-0"></span>
                    <span className="text-slate-700 dark:text-slate-300">
                        {parts.map((part, pIdx) => 
                            part.startsWith('**') && part.endsWith('**') 
                            ? <strong key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong> 
                            : part
                        )}
                    </span>
                </div>
             );
          }
          
           // Checkboxes
           if (line.trim().startsWith('[ ]') || line.trim().startsWith('- [ ]')) {
               const text = line.replace(/^-? ?\[ \] /, '');
               const parts = text.split(/(\*\*.*?\*\*)/g);
               return (
                  <div key={idx} className="flex items-start gap-3 ml-4 py-1.5 group">
                      <div className="mt-0.5 w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded flex-shrink-0 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 transition-colors"></div>
                      <span className="text-slate-700 dark:text-slate-300">
                           {parts.map((part, pIdx) => 
                            part.startsWith('**') && part.endsWith('**') 
                            ? <strong key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong> 
                            : part
                        )}
                      </span>
                  </div>
               );
           }

          // Empty lines
          if (!line.trim()) return <div key={idx} className="h-2"></div>;

          // Default Paragraph
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
             <p key={idx} className="text-slate-600 dark:text-slate-400">
                {parts.map((part, pIdx) => 
                    part.startsWith('**') && part.endsWith('**') 
                    ? <strong key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong> 
                    : part
                )}
             </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col animate-fade-in pb-20">
      
      <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Generated Runbook
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">AI-generated step-by-step guide based on extracted protocol.</p>
        </div>
        <div className="flex gap-2">
            {!isEditing && onUpdate && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
            )}
            {!isEditing && (
              <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  title="Copy Markdown"
              >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            <button 
                onClick={onExport}
                className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" /> Export Report
            </button>
        </div>
      </div>

      <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col ${isEditing ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}>
        {markdownContent ? (
           isEditing ? (
             <div className="flex-1 flex flex-col h-full">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                  <button onClick={handleCancel} className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button onClick={handleSave} className="px-3 py-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-1">
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
                <textarea 
                  className="flex-1 w-full p-6 font-mono text-sm outline-none resize-none bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
             </div>
           ) : (
            <div className="p-10 overflow-y-auto h-full">
              <SimpleMarkdownRenderer content={markdownContent} />
            </div>
           )
        ) : (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500 flex flex-col items-center">
                 <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg w-full max-w-md h-4 mb-2"></div>
                 <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg w-full max-w-sm h-4 mb-2"></div>
                 <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg w-full max-w-lg h-4 mb-8"></div>
                <p>Generating runbook...</p>
            </div>
        )}
      </div>
    </div>
  );
};