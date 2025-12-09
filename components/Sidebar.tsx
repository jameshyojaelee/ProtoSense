import React, { useRef, useState } from 'react';
import { Upload, FileText, Play, RotateCcw, FileType, AlertTriangle, Wand2, X, HelpCircle, Sparkles } from 'lucide-react';
import { ExperimentTemplate, FileInput } from '../types';

interface SidebarProps {
  onAnalyze: (input: FileInput, template: ExperimentTemplate) => void;
  isAnalyzing: boolean;
  onReset: () => void;
  onOpenAbout: () => void;
  onLaunchDemo: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAnalyze, isAnalyzing, onReset, onOpenAbout, onLaunchDemo }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [textInput, setTextInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ExperimentTemplate>(ExperimentTemplate.GENERAL);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        alert('Only PDF files are supported for upload currently.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isFileTooLarge = file ? file.size > 25 * 1024 * 1024 : false;

  const handleSubmit = () => {
    if (activeTab === 'upload' && file && !isFileTooLarge) {
        // Convert File to base64 for existing onAnalyze contract
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            onAnalyze({ type: 'pdf', content: base64, name: file.name }, selectedTemplate);
        };
        reader.readAsDataURL(file);
    } else if (activeTab === 'paste' && textInput.trim()) {
      onAnalyze({ type: 'text', content: textInput, name: 'Pasted Text' }, selectedTemplate);
    }
  };

  const handleLocalReset = () => {
    setFile(null);
    setTextInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onReset();
  };

  const isReady = (activeTab === 'upload' && !!file && !isFileTooLarge) || (activeTab === 'paste' && !!textInput.trim());

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-sm z-10 transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <FileType className="w-8 h-8" />
          ProtoSense
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Reproducibility Assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Demo Mode Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-16 h-16 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Demo Mode
            </h3>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mb-3 leading-relaxed">
                See the pipeline in action with a sample protocol containing common errors.
            </p>
            <button
                onClick={onLaunchDemo}
                disabled={isAnalyzing}
                className="w-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:border-indigo-300 font-medium text-xs py-2 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
                Launch Demo
            </button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>

        {/* Input Method Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'upload' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'paste' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Paste
          </button>
        </div>

        {/* Input Area */}
        <div className="min-h-[150px]">
          {activeTab === 'upload' ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer relative group
                ${isFileTooLarge ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileUpload}
              />
              <div className={`p-3 rounded-full mb-3 ${isFileTooLarge ? 'bg-red-100 dark:bg-red-900/30' : 'bg-indigo-50 dark:bg-slate-800'}`}>
                {isFileTooLarge ? (
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                ) : (
                    <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 break-all px-2">
                {file ? file.name : "Click to upload PDF"}
              </p>
              {file && (
                 <p className={`text-xs mt-1 font-mono ${isFileTooLarge ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                    {formatFileSize(file.size)}
                 </p>
              )}
              {!file && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Max 25MB</p>}
              
              {isFileTooLarge && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                      File too large. Please use an excerpt or paste text.
                  </div>
              )}

              {file && (
                <button 
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 p-1 bg-white dark:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-slate-200 dark:border-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full gap-2">
                <textarea
                className="w-full h-48 p-3 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                placeholder="Paste your methods text here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                ></textarea>
            </div>
          )}
        </div>

        {/* Template Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Experiment Template</label>
          <div className="relative">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as ExperimentTemplate)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none"
            >
              {Object.values(ExperimentTemplate).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={!isReady || isAnalyzing}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium shadow-md transition-all ${
            !isReady || isAnalyzing 
              ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
          }`}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" /> Analyze Protocol
            </>
          )}
        </button>

        <button
          onClick={handleLocalReset}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        
        <button
          onClick={onOpenAbout}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 text-xs hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mt-2"
        >
          <HelpCircle className="w-3 h-3" /> About & Disclaimer
        </button>
      </div>
    </div>
  );
};