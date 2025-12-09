import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Scorecard } from './components/Scorecard';
import { IssuesList } from './components/IssuesList';
import { Runbook } from './components/Runbook';
import { MethodsPatch } from './components/MethodsPatch';
import { ConsistencyPanel } from './components/ConsistencyPanel';
import { VisualsPanel } from './components/VisualsPanel';
import { StandardsPanel } from './components/StandardsPanel';
import { ChatPanel } from './components/ChatPanel';
import { AnalysisProgress, AnalysisStep } from './components/AnalysisProgress';
import { AboutModal } from './components/AboutModal';
import { DemoOverlay, DemoStep } from './components/DemoOverlay';
import { extractProtocol, initializeChat, critiqueReproducibility, generateRunbook, generateMethodsPatch, updateChatWithExtraction, runConsistencyChecks } from './services/geminiService';
import { calculateReproScore } from './src/scoring/reproScore';
import { AnalysisResult, ExperimentTemplate, FileInput, Issue, RunbookStep, Severity } from './types';
import { ProtocolExtraction, ReproScore } from './types/protocol';
import { MessageCircle, FileDown, LayoutDashboard, AlertCircle, ListChecks, GitPullRequest, Calculator, Download, Image as ImageIcon, ShieldCheck, Sun, Moon } from 'lucide-react';

const DEMO_PROTOCOL = `
# Cell Culture and Transfection Protocol (Demo)

## Cell Culture
HeLa cells were cultured in DMEM supplemented with 10% fetal bovine serum (FBS) and antibiotics at 37°C. Cells were passaged upon reaching confluence.

## Transfection
Cells were seeded in 6-well plates. The next day, cells were transfected with the target plasmid using Lipofectamine 2000 according to the manufacturer's instructions.

## Drug Treatment
24 hours post-transfection, cells were treated with Doxorubicin for 12 hours.

## Analysis
Cells were harvested and analyzed for viability.
`;

const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [reproScore, setReproScore] = useState<ReproScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [extractionData, setExtractionData] = useState<ProtocolExtraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'issues' | 'runbook' | 'patch' | 'consistency' | 'visuals' | 'standards'>('scorecard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  
  // Demo Script State
  const [demoStep, setDemoStep] = useState<DemoStep>(0);
  
  // Lifted State for Visuals Export
  const [generatedInfographic, setGeneratedInfographic] = useState<string | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auto-advance demo from Step 1 to Step 2 when analysis finishes
  useEffect(() => {
    if (demoStep === 1 && !isAnalyzing && analysisResult) {
      setDemoStep(2);
      setActiveTab('scorecard');
    }
  }, [demoStep, isAnalyzing, analysisResult]);

  const performAnalysis = async (input: FileInput, template: ExperimentTemplate, isDemo: boolean = false) => {
    setIsAnalyzing(true);
    setAnalysisStep('extracting');
    setError(null);
    setAnalysisResult(null);
    setReproScore(null);
    setExtractionData(null);
    setGeneratedInfographic(null);
    setHasContext(false);
    setIsDemoMode(isDemo);

    try {
      // 1. Extract structured protocol & Init Chat
      const [extraction] = await Promise.all([
        extractProtocol({
          model: 'gemini-3-pro-preview',
          pdfFile: null,
          pdfBase64: input.type === 'pdf' ? input.content : undefined,
          pastedText: input.type === 'text' ? input.content : '',
          template
        }),
        initializeChat(input).then(() => setHasContext(true))
      ]);
      
      setExtractionData(extraction);
      await updateChatWithExtraction(extraction);

      // 2. Score
      setAnalysisStep('scoring');
      const score = calculateReproScore(extraction);
      setReproScore(score);
      
      // Artificial delay for UI smoothness
      await new Promise(r => setTimeout(r, 600));

      // 3. Critique & Runbook
      setAnalysisStep('critiquing'); // Shared step visual for parallel work
      
      const critiquePromise = critiqueReproducibility({
        template,
        extractionJson: extraction,
        reproScore: score
      });
      
      // Fire runbook generation but don't wait on visual step update yet
      setAnalysisStep('runbook');
      const runbookPromise = generateRunbook({
        template,
        extractionJson: extraction
      });

      const critique = await critiquePromise;
      
      // 4. Patch
      setAnalysisStep('patching');
      const [runbookGen, patchGen] = await Promise.all([
        runbookPromise,
        generateMethodsPatch({ extractionJson: extraction, critique })
      ]);

      // 5. Finalize
      setAnalysisStep('complete');

      // Map to AnalysisResult
      const issues: Issue[] = extraction.missing_fields.map(f => ({
          severity: f.severity.charAt(0).toUpperCase() + f.severity.slice(1) as Severity,
          description: f.why_it_matters,
          missing_field: f.field,
          evidence_quote: null,
          fix_suggestion: `Please specify ${f.field}`
      }));

      extraction.ambiguities.forEach(a => {
          issues.push({
              severity: 'Major',
              description: `Ambiguity: ${a.text}`,
              missing_field: null,
              evidence_quote: a.evidence[0]?.quote || null,
              fix_suggestion: `Clarify: ${a.reason}`
          });
      });

      // Legacy structured runbook mapping
      const runbook: RunbookStep[] = extraction.steps.map((step, idx) => {
          const params = Object.entries(step.parameters)
              .filter(([_, v]) => v !== null)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
          
          return {
              step_number: idx + 1,
              instruction: `${step.action} ${params ? `(${params})` : ''}`,
              duration_estimate: step.parameters.time || null,
              critical_hazards: [], 
              reagents_needed: [] 
          };
      });

      const result: AnalysisResult = {
          overall_score: score.total,
          sub_scores: Object.entries(score.subscores).map(([k, v]) => ({
              category: k.charAt(0).toUpperCase() + k.slice(1),
              score: v,
              comment: ''
          })),
          issues,
          runbook,
          methods_patch_summary: `The protocol scored ${score.total}/100. It requires ${extraction.missing_fields.length} specific additions and clarification of ${extraction.ambiguities.length} ambiguous steps.`,
          critique,
          runbook_markdown: runbookGen.runbook_markdown,
          patch_markdown: patchGen.patch_markdown
      };

      setAnalysisResult(result);
      // Auto-switch to issues tab in demo mode to highlight findings (only if not running guided script, which handles tabs itself)
      if (!isDemo) setActiveTab('scorecard');
      
      // Short delay to show "Complete" state before switching view
      setTimeout(() => setIsAnalyzing(false), 500);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
      setIsAnalyzing(false);
      setAnalysisStep('idle');
    }
  };

  const handleAnalyze = (input: FileInput, template: ExperimentTemplate) => {
      performAnalysis(input, template, false);
  };

  const handleLaunchDemo = () => {
      setDemoStep(1);
      performAnalysis(
          { type: 'text', content: DEMO_PROTOCOL, name: 'Demo Protocol' },
          ExperimentTemplate.GENERAL,
          true
      );
  };

  const handleDemoNext = () => {
    if (demoStep === 2) {
      setDemoStep(3);
      setActiveTab('visuals');
    } else if (demoStep === 3) {
      setDemoStep(4);
      setActiveTab('standards');
    } else if (demoStep === 4) {
      setDemoStep(5);
      // Stay on standards or go to runbook? Let's stay on standards or go to Scorecard/Runbook
      // Let's go to runbook as it often connects to the final report.
      setActiveTab('runbook');
    } else if (demoStep === 5) {
      setDemoStep(0);
      setIsDemoMode(false);
    }
  };

  const handleRunConsistencyChecks = async () => {
    if (!extractionData || !analysisResult) return;
    setIsCheckingConsistency(true);
    try {
        const checkResult = await runConsistencyChecks({ extractionJson: extractionData });
        setAnalysisResult(prev => prev ? ({ ...prev, consistency_check: checkResult }) : null);
    } catch (err) {
        console.error("Consistency Check Error:", err);
    } finally {
        setIsCheckingConsistency(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setReproScore(null);
    setExtractionData(null);
    setError(null);
    setHasContext(false);
    setAnalysisStep('idle');
    setActiveTab('scorecard');
    setIsDemoMode(false);
    setDemoStep(0);
    setGeneratedInfographic(null);
  };

  const handleUpdateRunbook = (newMarkdown: string) => {
    if (analysisResult) {
      setAnalysisResult({ ...analysisResult, runbook_markdown: newMarkdown });
    }
  };

  const handleExportFullReport = () => {
    if (!analysisResult) return;

    let imageEmbed = '';
    if (generatedInfographic) {
      imageEmbed = `\n## Visual Runbook\n![Generated Infographic](${generatedInfographic})\n`;
    }

    const reportContent = `
# ProtoSense Analysis Report
**Date:** ${new Date().toLocaleDateString()}
**Overall Reproducibility Score:** ${analysisResult.overall_score}/100

## Executive Summary
${analysisResult.methods_patch_summary}

## Reproducibility Scorecard
${analysisResult.sub_scores.map(s => `- **${s.category}:** ${s.score}/100`).join('\n')}

## Identified Issues
${analysisResult.issues.map(i => `- [${i.severity}] ${i.description}\n  Fix: ${i.fix_suggestion}`).join('\n')}

## AI Critique & Questions
${analysisResult.critique?.prioritized_questions.map(q => `### ${q.question} (${q.severity})\n${q.rationale}`).join('\n\n') || 'None'}

## Suggested Methods Patch
\`\`\`diff
${analysisResult.patch_markdown || 'No patch generated.'}
\`\`\`

## Step-by-Step Runbook
${analysisResult.runbook_markdown || 'No runbook generated.'}
${imageEmbed}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ProtoSense_Report_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden ${darkMode ? 'dark' : ''}`}>
      <Sidebar 
        onAnalyze={handleAnalyze} 
        isAnalyzing={isAnalyzing} 
        onReset={handleReset} 
        onOpenAbout={() => setIsAboutOpen(true)}
        onLaunchDemo={handleLaunchDemo}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between shadow-sm z-10 overflow-x-auto transition-colors">
          <div className="flex gap-1 min-w-max">
             <button
               disabled={!analysisResult}
               onClick={() => setActiveTab('scorecard')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                 activeTab === 'scorecard' && analysisResult 
                   ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50'
               }`}
             >
               <LayoutDashboard className="w-4 h-4" /> Scorecard
             </button>
             <button
               disabled={!analysisResult}
               onClick={() => setActiveTab('issues')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                 activeTab === 'issues' && analysisResult
                   ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50'
               }`}
             >
               <AlertCircle className="w-4 h-4" /> Issues 
               {analysisResult && (
                 <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-xs px-1.5 py-0.5 rounded-full">
                    {analysisResult.issues.length + (analysisResult.critique?.prioritized_questions.length || 0)}
                 </span>
               )}
             </button>
             <button
               disabled={!analysisResult}
               onClick={() => setActiveTab('runbook')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                 activeTab === 'runbook' && analysisResult
                   ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50'
               }`}
             >
               <ListChecks className="w-4 h-4" /> Runbook
             </button>
             <button
               disabled={!analysisResult}
               onClick={() => setActiveTab('patch')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                 activeTab === 'patch' && analysisResult
                   ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50'
               }`}
             >
               <GitPullRequest className="w-4 h-4" /> Methods Patch
             </button>
             <button
               disabled={!analysisResult}
               onClick={() => setActiveTab('consistency')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                 activeTab === 'consistency' && analysisResult
                   ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50'
               }`}
             >
               <Calculator className="w-4 h-4" /> Consistency
             </button>
             <button
               disabled={!analysisResult}
               onClick={() => setActiveTab('standards')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                 activeTab === 'standards' && analysisResult
                   ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50'
               }`}
             >
               <ShieldCheck className="w-4 h-4" /> Standards
             </button>
             <button
               disabled={!analysisResult}
               onClick={() => setActiveTab('visuals')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                 activeTab === 'visuals' && analysisResult
                   ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50'
               }`}
             >
               <ImageIcon className="w-4 h-4" /> Visuals
             </button>
          </div>

          <div className="flex items-center gap-3">
             <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Dark Mode"
             >
                {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
             </button>
             {analysisResult && (
                 <button
                    onClick={handleExportFullReport}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm"
                 >
                    <Download className="w-4 h-4" />
                    Full Report
                 </button>
             )}
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
             <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                    isChatOpen ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
             >
                <MessageCircle className="w-6 h-6" />
             </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
            {!analysisResult && !isAnalyzing && !error && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <FileDown className="w-24 h-24 mb-6 opacity-20" />
                    <h2 className="text-xl font-medium text-slate-600 dark:text-slate-300 mb-2">Ready to Analyze</h2>
                    <p className="text-sm max-w-md text-center text-slate-500 dark:text-slate-400">
                        Upload a PDF protocol or paste your methods section to generate a reproducibility scorecard and runbook.
                    </p>
                </div>
            )}

            {isAnalyzing && (
                 <div className="h-full flex flex-col items-center justify-center">
                    <AnalysisProgress currentStep={analysisStep} />
                </div>
            )}

            {error && (
                <div className="p-8 max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">Analysis Error</h3>
                    <p className="text-red-600 dark:text-red-300">{error}</p>
                </div>
            )}

            {analysisResult && reproScore && !isAnalyzing && (
                <div className="h-full animate-fade-in">
                    {activeTab === 'scorecard' && <Scorecard score={reproScore} />}
                    {activeTab === 'issues' && <IssuesList issues={analysisResult.issues} summary={analysisResult.methods_patch_summary} critique={analysisResult.critique} isDemoMode={isDemoMode} />}
                    {activeTab === 'runbook' && (
                        <Runbook 
                            runbook={analysisResult.runbook} 
                            markdownContent={analysisResult.runbook_markdown} 
                            onExport={handleExportFullReport}
                            onUpdate={handleUpdateRunbook}
                        />
                    )}
                    {activeTab === 'patch' && <MethodsPatch patchMarkdown={analysisResult.patch_markdown} />}
                    {activeTab === 'consistency' && (
                        <ConsistencyPanel 
                            data={analysisResult.consistency_check} 
                            isLoading={isCheckingConsistency}
                            onRunChecks={handleRunConsistencyChecks}
                        />
                    )}
                    {activeTab === 'standards' && extractionData && (
                        <StandardsPanel extractionData={extractionData} />
                    )}
                    {activeTab === 'visuals' && (
                        <VisualsPanel 
                            runbookMarkdown={analysisResult.runbook_markdown || ''}
                            scorecard={reproScore}
                            topIssues={analysisResult.issues}
                            generatedInfographic={generatedInfographic}
                            setGeneratedInfographic={setGeneratedInfographic}
                        />
                    )}
                </div>
            )}
        </main>

        <ChatPanel 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
            hasContext={hasContext} 
        />
        
        <AboutModal 
            isOpen={isAboutOpen}
            onClose={() => setIsAboutOpen(false)}
        />

        <DemoOverlay 
            step={demoStep}
            onNext={handleDemoNext}
            onExit={() => { setDemoStep(0); setIsDemoMode(false); }}
            isAnalyzing={isAnalyzing}
        />
      </div>
    </div>
  );
};

export default App;