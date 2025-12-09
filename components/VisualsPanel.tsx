import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Zap, Star, Download, AlertTriangle, Loader2, PenTool, Upload, X, HelpCircle, Maximize2, Monitor, Smartphone, Square, Send, Wand2 } from 'lucide-react';
import { generateRunbookInfographic, cleanupSketchToDiagram, editRunbookInfographic } from '../services/geminiService';
import { ReproScore } from '../types/protocol';
import { Issue } from '../types';

interface VisualsPanelProps {
  runbookMarkdown: string;
  scorecard: ReproScore;
  topIssues: Issue[];
  generatedInfographic: string | null;
  setGeneratedInfographic: (data: string | null) => void;
}

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

export const VisualsPanel: React.FC<VisualsPanelProps> = ({ 
  runbookMarkdown, 
  scorecard, 
  topIssues,
  generatedInfographic,
  setGeneratedInfographic
}) => {
  const [activeTab, setActiveTab] = useState<'infographic' | 'sketch'>('infographic');
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Infographic State
  const [loadingInfographic, setLoadingInfographic] = useState(false);
  const [quality, setQuality] = useState<'fast' | 'pro'>('fast');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [errorInfographic, setErrorInfographic] = useState<string | null>(null);

  // Fine-tuning State
  const [fineTunePrompt, setFineTunePrompt] = useState('');
  const [isFineTuning, setIsFineTuning] = useState(false);

  // Sketch State
  const [sketchFile, setSketchFile] = useState<File | null>(null);
  const [sketchPreview, setSketchPreview] = useState<string | null>(null);
  const [userIntent, setUserIntent] = useState('');
  const [generatedDiagram, setGeneratedDiagram] = useState<string | null>(null);
  const [diagramQuestions, setDiagramQuestions] = useState<string[]>([]);
  const [loadingSketch, setLoadingSketch] = useState(false);
  const [errorSketch, setErrorSketch] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Infographic Handlers ---

  const handleGenerateInfographic = async () => {
    // API Key check for Pro model
    if (quality === 'pro') {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          const success = await aistudio.openSelectKey();
          if (!success) return; // User cancelled
        }
      }
    }

    setLoadingInfographic(true);
    setErrorInfographic(null);
    try {
      const imageBase64 = await generateRunbookInfographic({
        runbookMarkdown,
        scorecard,
        topIssues,
        quality,
        aspectRatio,
        imageSize: quality === 'pro' ? '2K' : undefined
      });
      setGeneratedInfographic(imageBase64);
    } catch (err: any) {
      setErrorInfographic(err.message || "Failed to generate image.");
    } finally {
      setLoadingInfographic(false);
    }
  };

  const handleFineTune = async () => {
    if (!generatedInfographic || !fineTunePrompt.trim()) return;

    // API Key check for Pro model fine-tuning
    if (quality === 'pro') {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          const success = await aistudio.openSelectKey();
          if (!success) return;
        }
      }
    }

    setIsFineTuning(true);
    setErrorInfographic(null);
    try {
      const newImage = await editRunbookInfographic({
        imageBase64: generatedInfographic,
        prompt: fineTunePrompt,
        quality,
        aspectRatio
      });
      setGeneratedInfographic(newImage);
      setFineTunePrompt('');
    } catch (err: any) {
      setErrorInfographic(err.message || "Failed to edit image.");
    } finally {
      setIsFineTuning(false);
    }
  };

  const handleDownloadInfographic = () => {
    if (generatedInfographic) {
      const link = document.createElement('a');
      link.href = generatedInfographic;
      link.download = `runbook-infographic-${quality}-${aspectRatio.replace(':','-')}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Sketch Handlers ---

  const handleSketchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSketchFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSketchPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSketch = () => {
    setSketchFile(null);
    setSketchPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCleanUpDiagram = async () => {
    if (!sketchFile) return;
    setLoadingSketch(true);
    setErrorSketch(null);
    setGeneratedDiagram(null);
    setDiagramQuestions([]);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(sketchFile);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = sketchFile.type;
        
        const result = await cleanupSketchToDiagram({
          imageBase64: base64String,
          mimeType,
          userIntent
        });

        setGeneratedDiagram(result.cleanedDiagramPng);
        setDiagramQuestions(result.questions);
        setLoadingSketch(false);
      };
      reader.onerror = () => {
        throw new Error("Failed to read file.");
      }
    } catch (err: any) {
      setErrorSketch(err.message || "Failed to clean up diagram.");
      setLoadingSketch(false);
    }
  };

  const handleDownloadDiagram = () => {
    if (generatedDiagram) {
      const link = document.createElement('a');
      link.href = generatedDiagram;
      link.download = `cleaned-diagram-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const AspectRatioIcon = ({ ratio }: { ratio: AspectRatio }) => {
    if (ratio === '16:9') return <Monitor className="w-4 h-4" />;
    if (ratio === '9:16') return <Smartphone className="w-4 h-4" />;
    return <Square className="w-4 h-4" />;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Visuals & Diagrams
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Generate infographics or clean up handwritten sketches.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
           <button
             onClick={() => setActiveTab('infographic')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
               activeTab === 'infographic' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
             }`}
           >
             <Zap className="w-4 h-4" /> Runbook Infographic
           </button>
           <button
             onClick={() => setActiveTab('sketch')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
               activeTab === 'sketch' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
             }`}
           >
             <PenTool className="w-4 h-4" /> Sketch to Diagram
           </button>
        </div>
      </div>

      {activeTab === 'infographic' ? (
        <div className="grid md:grid-cols-3 gap-6 h-full min-h-[600px]">
          {/* Infographic Controls */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Generation Model</label>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${quality === 'fast' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <input 
                    type="radio" 
                    name="quality" 
                    value="fast" 
                    checked={quality === 'fast'} 
                    onChange={() => setQuality('fast')}
                    className="hidden" 
                  />
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Fast</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Gemini 2.5 Flash</div>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${quality === 'pro' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <input 
                    type="radio" 
                    name="quality" 
                    value="pro" 
                    checked={quality === 'pro'} 
                    onChange={() => setQuality('pro')}
                    className="hidden" 
                  />
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Pro High-Res</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Gemini 3 Pro (2K/4K)</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                 {(['16:9', '4:3', '1:1', '3:4', '9:16'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border transition-all ${
                        aspectRatio === ratio
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <AspectRatioIcon ratio={ratio} />
                      <span className="text-[10px] font-medium">{ratio}</span>
                    </button>
                 ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                  onClick={handleGenerateInfographic}
                  disabled={loadingInfographic}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                  {loadingInfographic ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                  {loadingInfographic ? "Generating..." : "Generate Infographic"}
              </button>
            </div>

            <div className="mt-auto bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p>Image is illustrative. Verify all values against the text runbook before use.</p>
            </div>
          </div>

          {/* Infographic Preview */}
          <div className="md:col-span-2 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative group h-full">
            {generatedInfographic ? (
              <div className="flex flex-col h-full">
                {/* Image Area */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative bg-checkerboard">
                  <img 
                    src={generatedInfographic} 
                    alt="Protocol Infographic" 
                    className="max-w-full max-h-full object-contain shadow-sm"
                  />
                  
                  {isFineTuning && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm z-10">
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xl flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">Refining Image...</span>
                          </div>
                      </div>
                  )}

                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button 
                        onClick={() => setShowFullscreen(true)}
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg shadow-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
                        title="Expand View"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleDownloadInfographic}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold hover:bg-indigo-700"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                  </div>
                </div>

                {/* Fine-Tuning Bar */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Wand2 className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                            <input
                                type="text"
                                value={fineTunePrompt}
                                onChange={(e) => setFineTunePrompt(e.target.value)}
                                placeholder="Describe changes (e.g., 'Add a step for incubation', 'Change background to white')..."
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleFineTune()}
                                disabled={isFineTuning}
                            />
                        </div>
                        <button
                            onClick={handleFineTune}
                            disabled={!fineTunePrompt.trim() || isFineTuning}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center h-full">
                  {loadingInfographic ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-slate-300 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="animate-pulse">Designing infographic...</p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                      <p className="font-medium">No image generated yet.</p>
                      <p className="text-sm">Select quality & aspect ratio, then click Generate.</p>
                      {errorInfographic && (
                        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm max-w-sm">
                          Error: {errorInfographic}
                        </div>
                      )}
                    </>
                  )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 h-full min-h-[500px]">
          {/* Sketch Input */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
             <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">1. Upload Sketch</h3>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer transition-colors relative
                    ${sketchFile ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                  `}
                >
                  <input 
                     type="file" 
                     ref={fileInputRef} 
                     className="hidden" 
                     accept="image/*"
                     onChange={handleSketchUpload} 
                  />
                  {sketchPreview ? (
                     <img src={sketchPreview} alt="Sketch Preview" className="h-full w-full object-contain p-2" />
                  ) : (
                     <>
                       <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                       <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Click to upload image</p>
                       <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG supported</p>
                     </>
                  )}
                  {sketchFile && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleRemoveSketch(); }}
                       className="absolute top-2 right-2 p-1 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:text-red-500"
                     >
                       <X className="w-4 h-4" />
                     </button>
                  )}
                </div>
             </div>

             <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">2. Context (Optional)</h3>
                <textarea
                   className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                   rows={3}
                   placeholder="e.g. This is a plate layout for the cytotoxicity assay. The labels are concentrations in uM."
                   value={userIntent}
                   onChange={(e) => setUserIntent(e.target.value)}
                />
             </div>

             <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
               <button
                  onClick={handleCleanUpDiagram}
                  disabled={!sketchFile || loadingSketch}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
               >
                  {loadingSketch ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
                  {loadingSketch ? "Cleaning up..." : "Clean Up Diagram"}
               </button>
               {errorSketch && (
                 <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                   {errorSketch}
                 </div>
               )}
             </div>
          </div>

          {/* Sketch Output */}
          <div className="bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative group">
             {generatedDiagram ? (
               <div className="flex flex-col h-full">
                  <div className="flex-1 relative bg-white m-2 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <img 
                       src={generatedDiagram} 
                       alt="Cleaned Diagram" 
                       className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 right-4">
                      <button 
                        onClick={handleDownloadDiagram}
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg shadow-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                    </div>
                  </div>
                  
                  {diagramQuestions.length > 0 && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border-t border-yellow-200 dark:border-yellow-900/50">
                       <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" /> Unclear Items
                       </h4>
                       <ul className="text-xs text-yellow-800 dark:text-yellow-400 space-y-1 list-disc pl-4">
                          {diagramQuestions.map((q, idx) => (
                             <li key={idx}>{q}</li>
                          ))}
                       </ul>
                    </div>
                  )}
               </div>
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center">
                    {loadingSketch ? (
                       <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-slate-300 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
                          <p className="animate-pulse">Redrawing sketch...</p>
                       </div>
                    ) : (
                       <>
                         <PenTool className="w-16 h-16 mb-4 opacity-20" />
                         <p className="font-medium">No diagram generated yet.</p>
                         <p className="text-sm">Upload a sketch and click Clean Up.</p>
                       </>
                    )}
                </div>
             )}
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && generatedInfographic && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in">
          <button 
            onClick={() => setShowFullscreen(false)}
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center">
             <img 
               src={generatedInfographic} 
               alt="Full Infographic" 
               className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
             />
          </div>
        </div>
      )}
    </div>
  );
};