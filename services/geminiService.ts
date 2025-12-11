
import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AnalysisResult, ConsistencyCheckResult, DeepAnalysisResult, ExperimentTemplate, FileInput, Issue, Checklist, ChecklistComparisonResult, StandardCitation, SimulationLog, MaterialValidation } from "../types";
import { ProtocolExtraction, ReproScore, ReproducibilityCritique } from "../types/protocol";

// Helper to get a fresh client (important for dynamic API key updates in AI Studio)
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Initialize default client for static calls
const ai = getAiClient();

// Schema Definition for Analysis
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overall_score: { type: Type.NUMBER, description: "Overall reproducibility score 0-100 based on completeness and clarity." },
    sub_scores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "e.g., 'Reagents', 'Timing', 'Equipment', 'Statistical Analysis'" },
          score: { type: Type.NUMBER, description: "0-100" },
          comment: { type: Type.STRING, description: "Brief justification." }
        },
        required: ["category", "score", "comment"]
      }
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: { type: Type.STRING, enum: ["Blocker", "Major", "Minor"] },
          description: { type: Type.STRING, description: "What is missing or ambiguous?" },
          missing_field: { type: Type.STRING, nullable: true, description: "The specific parameter missing (e.g., 'Centrifuge g-force'). Null if generic." },
          evidence_quote: { type: Type.STRING, nullable: true, description: "Quote from text showing the ambiguity. Null if completely absent." },
          fix_suggestion: { type: Type.STRING, description: "How to fix this issue." }
        },
        required: ["severity", "description", "fix_suggestion"]
      }
    },
    runbook: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step_number: { type: Type.INTEGER },
          instruction: { type: Type.STRING, description: "Clear, imperative instruction." },
          duration_estimate: { type: Type.STRING, nullable: true, description: "Estimated time e.g., '30 mins'. Null if unknown." },
          critical_hazards: { type: Type.ARRAY, items: { type: Type.STRING } },
          reagents_needed: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["step_number", "instruction", "critical_hazards", "reagents_needed"]
      }
    },
    methods_patch_summary: { type: Type.STRING, description: "A paragraph text summarizing what needs to be added to the methods section to make it reproducible." }
  },
  required: ["overall_score", "sub_scores", "issues", "runbook", "methods_patch_summary"]
};

// Schema Definition for Extraction
const evidenceSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      quote: { type: Type.STRING },
      location: { type: Type.STRING, nullable: true }
    },
    required: ["quote"]
  }
};

const extractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    doc_title: { type: Type.STRING, nullable: true },
    experiment_template: { type: Type.STRING, enum: ["general", "cell_culture", "sequencing", "microscopy", "crispr", "other"] },
    organisms_or_samples: { type: Type.ARRAY, items: { type: Type.STRING } },
    objective: { type: Type.STRING, nullable: true },
    materials: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ["reagent", "equipment", "software", "consumable", "other"] },
          vendor: { type: Type.STRING, nullable: true },
          identifier: { type: Type.STRING, nullable: true },
          notes: { type: Type.STRING, nullable: true },
          evidence: evidenceSchema
        },
        required: ["name", "category", "evidence"]
      }
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step_id: { type: Type.STRING },
          phase: { type: Type.STRING, nullable: true },
          action: { type: Type.STRING },
          parameters: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING, nullable: true },
              temperature: { type: Type.STRING, nullable: true },
              volume: { type: Type.STRING, nullable: true },
              concentration: { type: Type.STRING, nullable: true },
              speed: { type: Type.STRING, nullable: true },
              other: { type: Type.STRING, nullable: true }
            }
          },
          notes: { type: Type.STRING, nullable: true },
          evidence: evidenceSchema
        },
        required: ["step_id", "action", "parameters", "evidence"]
      }
    },
    controls_and_replicates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          evidence: evidenceSchema
        },
        required: ["type", "description", "evidence"]
      }
    },
    qc_checks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          measurement: { type: Type.STRING },
          acceptance_criteria: { type: Type.STRING, nullable: true },
          when: { type: Type.STRING, nullable: true },
          evidence: evidenceSchema
        },
        required: ["measurement", "evidence"]
      }
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        software: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              version: { type: Type.STRING, nullable: true },
              evidence: evidenceSchema
            },
            required: ["name", "evidence"]
          }
        },
        stats: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              test: { type: Type.STRING },
              details: { type: Type.STRING, nullable: true },
              evidence: evidenceSchema
            },
            required: ["test", "evidence"]
          }
        }
      },
      required: ["software", "stats"]
    },
    ambiguities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          reason: { type: Type.STRING },
          evidence: evidenceSchema
        },
        required: ["text", "reason", "evidence"]
      }
    },
    missing_fields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["blocker", "major", "minor"] },
          why_it_matters: { type: Type.STRING }
        },
        required: ["field", "severity", "why_it_matters"]
      }
    },
    contradictions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          evidence: evidenceSchema
        },
        required: ["description", "evidence"]
      }
    }
  },
  required: [
    "experiment_template", "materials", "steps", 
    "controls_and_replicates", "qc_checks", "analysis", 
    "ambiguities", "missing_fields", "contradictions"
  ]
};

// Schema for Critique
const critiqueSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    prioritized_questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: { type: Type.STRING, enum: ["blocker", "major", "minor"] },
          question: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ["severity", "question", "rationale"],
      },
    },
    suggested_fixes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: { type: Type.STRING, enum: ["blocker", "major", "minor"] },
          fix_text: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ["severity", "fix_text", "rationale"],
      },
    },
  },
  required: ["prioritized_questions", "suggested_fixes"],
};

// Schema for Runbook Markdown
const runbookSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    runbook_markdown: { type: Type.STRING, description: "The complete runbook in Markdown format." },
  },
  required: ["runbook_markdown"],
};

// Schema for Methods Patch
const patchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    patch_markdown: { type: Type.STRING, description: "The methods patch in diff-like markdown format." },
  },
  required: ["patch_markdown"],
};

// Schema for Consistency Checks
const consistencySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    timeline_minutes_estimate: { type: Type.NUMBER, description: "Total estimated time in minutes." },
    timeline_explanation: { type: Type.STRING, description: "Explanation of how the time was calculated." },
    flagged_inconsistencies: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of unit inconsistencies or logical gaps."
    },
    computed_dilutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          reagent: { type: Type.STRING },
          calculation: { type: Type.STRING },
          instruction: { type: Type.STRING }
        },
        required: ["reagent", "calculation", "instruction"]
      }
    }
  },
  required: ["timeline_minutes_estimate", "timeline_explanation", "flagged_inconsistencies", "computed_dilutions"]
};

// Schema for Standards Comparison
const comparisonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    checklistName: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          itemId: { type: Type.STRING },
          requirement: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["Covered", "Partial", "Missing"] },
          evidence: { type: Type.STRING, nullable: true },
          fixSuggestion: { type: Type.STRING, nullable: true }
        },
        required: ["itemId", "requirement", "status"]
      }
    }
  },
  required: ["checklistName", "items"]
};

// --- Deep Analysis Schemas ---
const simulationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    simulation_logs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepId: { type: Type.INTEGER },
          action: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["Success", "Warning", "Critical Failure"] },
          simulation_note: { type: Type.STRING, description: "The robot's thought process or error log." },
          state_change: { type: Type.STRING, description: "What happened to the sample? e.g. 'Sample is now in pellet form'." }
        },
        required: ["stepId", "action", "status", "simulation_note", "state_change"]
      }
    }
  },
  required: ["simulation_logs"]
};

const validationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    material_validations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          material_name: { type: Type.STRING },
          catalog_number: { type: Type.STRING, nullable: true },
          status: { type: Type.STRING, enum: ["Verified", "Not Found", "Discontinued", "Ambiguous"] },
          search_finding: { type: Type.STRING, description: "Summary of Google Search result." }
        },
        required: ["material_name", "status", "search_finding"]
      }
    }
  },
  required: ["material_validations"]
};


export const analyzeProtocol = async (
  input: FileInput,
  template: ExperimentTemplate
): Promise<AnalysisResult> => {
  const modelId = "gemini-3-pro-preview";

  const promptText = `
    You are a strict scientific reviewer assessing a "Methods" section for reproducibility.
    The user has selected the template: ${template}.
    
    Analyze the provided content. 
    1. Score the reproducibility (0-100).
    2. Identify specific missing details (e.g., missing catalog numbers, undefined incubation times, vague concentrations).
    3. Be conservative: if a parameter is not explicitly stated, mark it as a missing issue.
    4. Generate a step-by-step "Runbook" checklist that a junior scientist could follow.
    5. Output strictly in JSON format.
  `;

  const parts = [];
  
  // Add file content
  if (input.type === 'pdf') {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: input.content
      }
    });
  } else {
    parts.push({ text: input.content });
  }

  // Add Prompt
  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1, // Deterministic
        thinkingConfig: { thinkingBudget: 1024 } 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from model");
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Analysis Failed:", error);
    throw error;
  }
};

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const extractProtocol = async ({
  model = "gemini-3-pro-preview",
  pdfFile,
  pdfBase64,
  pastedText,
  template
}: {
  model?: string,
  pdfFile: File | null,
  pdfBase64?: string,
  pastedText: string,
  template: string
}): Promise<ProtocolExtraction> => {
  try {
    const parts = [];

    if (pdfFile) {
      if (pdfFile.type !== 'application/pdf') {
        throw new Error("Invalid file type. Only PDF is supported.");
      }
      const filePart = await fileToGenerativePart(pdfFile);
      parts.push(filePart);
    } else if (pdfBase64) {
      parts.push({
        inlineData: {
          data: pdfBase64,
          mimeType: 'application/pdf',
        }
      });
    }

    if (pastedText && pastedText.trim()) {
      parts.push({ text: pastedText });
    }

    if (parts.length === 0) {
      throw new Error("No input provided. Please upload a PDF or paste text.");
    }

    const promptText = `
      Extract a structured scientific protocol from the provided content.
      Experiment Template: ${template}
      
      Instructions:
      1. Extract ONLY what is explicitly stated. Use null when missing. 
      2. Provide short evidence quotes for each extracted item with an approximate location like 'Methods: Cell culture' or 'Page 3, paragraph 2' if you can infer it; otherwise location null.
      3. Fill the response strictly according to the JSON schema.
      4. For ambiguities, list the text and why it's ambiguous.
    `;
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
        temperature: 0.1, // Deterministic
        thinkingConfig: { thinkingBudget: 2048 } 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from model");
    return JSON.parse(text) as ProtocolExtraction;

  } catch (error: any) {
    console.error("Extraction Failed:", error);
    // Return a typed error if needed, or rethrow for UI to handle
    throw new Error(error.message || "Failed to extract protocol.");
  }
};

export const critiqueReproducibility = async ({
  template,
  extractionJson,
  reproScore,
}: {
  template: string;
  extractionJson: ProtocolExtraction;
  reproScore: ReproScore;
}): Promise<ReproducibilityCritique> => {
  const modelId = "gemini-3-pro-preview";
  
  const promptText = `
    You are a reproducibility reviewer. Use the extracted JSON and the scoring summary.
    Do not invent details.
    
    Context:
    Template: ${template}
    Repro Score: ${reproScore.total}/100
    
    Extraction JSON:
    ${JSON.stringify(extractionJson)}

    Instructions:
    - Output highly specific questions (e.g., 'What was the incubation time and temperature for step 4?' not generic advice).
    - Keep each rationale to 1–2 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: critiqueSchema,
        temperature: 0.1, // Deterministic
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from critique model");
    return JSON.parse(text) as ReproducibilityCritique;
  } catch (error: any) {
    console.error("Critique Failed:", error);
    // Return empty if failed to avoid crashing app
    return { prioritized_questions: [], suggested_fixes: [] };
  }
};

export const generateRunbook = async ({
  template,
  extractionJson,
}: {
  template: string;
  extractionJson: ProtocolExtraction;
}): Promise<{ runbook_markdown: string }> => {
  const modelId = "gemini-3-pro-preview";

  const promptText = `
    Convert the extracted protocol JSON into a clean, professional runbook in Markdown format.
    
    Context:
    Template: ${template}
    Extraction JSON: ${JSON.stringify(extractionJson)}

    Structure the Markdown with these headings:
    # Overview
    ## Materials
    ## Setup
    ## Step-by-step Procedure (Checklist style)
    ## QC Checkpoints
    ## Expected Outputs
    ## Troubleshooting
    ## Analysis Notes

    Rules:
    - For any missing fields or details, explicitly mark them as "**TBD (missing in source)**".
    - Keep it concise and checklist-friendly (use checkboxes [ ] for steps).
    - Format cleanly with bold text for emphasis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: runbookSchema,
        temperature: 0.1, // Deterministic
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from runbook model");
    return JSON.parse(text) as { runbook_markdown: string };
  } catch (error: any) {
    console.error("Runbook Generation Failed:", error);
    // Fallback basic markdown
    return { runbook_markdown: "# Runbook Generation Failed\n\nPlease try again." };
  }
};

export const generateMethodsPatch = async ({
  extractionJson,
  critique,
}: {
  extractionJson: ProtocolExtraction;
  critique: ReproducibilityCritique;
}): Promise<{ patch_markdown: string }> => {
  const modelId = "gemini-3-pro-preview";
  const promptText = `
    Write suggested Methods text to improve reproducibility based on the extraction and critique.
    Use a diff-like format for the markdown output:
      + Add: [Text to insert]
      ~ Revise: [Text to change] -> [New text]
      - Remove: [Text to remove]

    Do not add new scientific claims. Only add missing procedural clarity based on the critique.
    
    Context:
    Extraction: ${JSON.stringify(extractionJson)}
    Critique: ${JSON.stringify(critique)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: patchSchema,
        temperature: 0.1, // Deterministic
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from patch model");
    return JSON.parse(text) as { patch_markdown: string };
  } catch (error: any) {
    console.error("Methods Patch Generation Failed:", error);
    return { patch_markdown: "# Patch Generation Failed\n\nPlease try again." };
  }
};

export const runConsistencyChecks = async ({
  extractionJson
}: {
  extractionJson: ProtocolExtraction
}): Promise<ConsistencyCheckResult> => {
  const modelId = "gemini-2.5-flash"; // Using 2.5 Flash for code execution tasks as it is robust for tools
  const promptText = `
    You are a computational biologist.
    Here is a structured protocol extraction: ${JSON.stringify(extractionJson)}
    
    Write and execute Python code to:
    1. Estimate total time in minutes by parsing 'time' parameters in the 'steps' array (convert '1 hr' to 60, 'overnight' to 960, etc.). Sum them up. Return 0 if no time info is found.
    2. Check for unit inconsistencies (e.g. uL vs ml mixed without logic, or mass vs volume ambiguity) in parameters.
    3. Identify steps that mention a concentration parameter where a dilution calculation might be needed (e.g. "Add 50 ug/mL X to Y"). If a dilution seems implied, calculate an example volume (assume 100uL total volume if unknown).

    Your code should print the result in JSON format.
    Finally, return a JSON response matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: consistencySchema,
        tools: [{ codeExecution: {} }],
        temperature: 0.1, // Deterministic
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from consistency check model");
    return JSON.parse(text) as ConsistencyCheckResult;
  } catch (error: any) {
    console.error("Consistency Check Failed:", error);
    throw new Error("Failed to run consistency checks.");
  }
};

// --- New Agentic Workflows ---

export const runVirtualSimulation = async ({
  extractionJson
}: {
  extractionJson: ProtocolExtraction
}): Promise<SimulationLog[]> => {
  const modelId = "gemini-3-pro-preview";
  
  const promptText = `
    Act as a "Virtual Laboratory Robot". You are attempting to physically execute this protocol based ONLY on the provided JSON.
    
    Protocol: ${JSON.stringify(extractionJson)}
    
    Task:
    Go through the steps 1 by 1.
    For each step, simulate the physical action.
    - If a volume is missing, you cannot proceed safely -> Log "Critical Failure" or "Warning".
    - If a container type is not specified (e.g. "Transfer to tube" but doesn't say 1.5ml or 15ml), Log "Warning".
    - If logic flows correctly, Log "Success" and update the state (e.g. "Sample is now a pellet").
    - If there is a "ghost step" (e.g. discard supernatant, but next step analyzes supernatant), Log "Critical Failure".

    Output a JSON list of logs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: simulationSchema,
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 2048 } // Use thinking for deep simulation
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from simulation model");
    const result = JSON.parse(text);
    return result.simulation_logs;
  } catch (error: any) {
    console.error("Virtual Simulation Failed:", error);
    throw new Error("Failed to run virtual simulation.");
  }
};

export const validateMaterials = async ({
  extractionJson
}: {
  extractionJson: ProtocolExtraction
}): Promise<MaterialValidation[]> => {
  const modelId = "gemini-3-pro-preview";
  
  const materialsToCheck = extractionJson.materials.filter(m => m.category === 'reagent' || m.category === 'equipment');
  const materialsList = materialsToCheck.map(m => `${m.name} ${m.vendor ? `(${m.vendor})` : ''} ${m.identifier ? `[ID: ${m.identifier}]` : ''}`).join('\n');

  if (materialsToCheck.length === 0) return [];

  const promptText = `
    You are a Procurement Specialist. Validate these scientific materials.
    
    Materials:
    ${materialsList}
    
    Task:
    Search for each item.
    - Does the vendor exist?
    - Does the product/catalog number exist?
    - Is it discontinued?
    
    Return a structured validation list.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseSchema: validationSchema, // Using schema with tool use is tricky, usually we let it return text then parse, but Gemini 3 supports schema + search well.
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    
    // Sometimes Google Search tool + JSON schema can be finicky. 
    // If it fails to return strict JSON, we might need a fallback, but Gemini 3 Pro is usually good.
    const text = response.text;
    if (!text) throw new Error("No response from material validation");
    
    // Clean potential markdown blocks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);
    return result.material_validations;

  } catch (error: any) {
    console.error("Material Validation Failed:", error);
    // Return empty list rather than crashing, as search might quota limit
    return [];
  }
};

export const runDeepAnalysis = async ({
  extractionJson
}: {
  extractionJson: ProtocolExtraction
}): Promise<DeepAnalysisResult> => {
  // Run agents in parallel
  const [simulationLogs, materialValidations] = await Promise.all([
    runVirtualSimulation({ extractionJson }),
    validateMaterials({ extractionJson })
  ]);

  return {
    simulation_logs: simulationLogs,
    material_validations: materialValidations
  };
};


// --- Visual Generation ---

export const generateRunbookInfographic = async ({
  runbookMarkdown,
  scorecard,
  topIssues,
  quality = 'fast',
  aspectRatio = '16:9',
  imageSize = '2K'
}: {
  runbookMarkdown: string;
  scorecard: ReproScore;
  topIssues: Issue[];
  quality: 'fast' | 'pro';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  imageSize?: '1K' | '2K' | '4K';
}): Promise<string> => {
  const modelId = quality === 'fast' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
  
  // Construct a prompt that summarizes the runbook into visual instructions
  const promptText = `
    Create a high-quality scientific infographic summarizing this protocol runbook.
    
    DATA SOURCE:
    Reproducibility Score: ${scorecard.total}/100
    
    Top Warnings:
    ${topIssues.slice(0, 3).map(i => `- ${i.description}`).join('\n')}

    Protocol Steps Summary (Visualize as a flowchart or timeline):
    ${runbookMarkdown.substring(0, 3000)}... [Truncated for prompt limits]

    DESIGN STYLE:
    - Clean, modern vector-style infographic.
    - White background.
    - Professional scientific aesthetic (blue/slate color palette).
    - Use simple icons for steps (pipettes, tubes, microscopes).
    - NO realistic photos. 
    - Text must be legible. 
    - IMPORTANT: Do not invent parameters. If a value is missing in the text, label it as "TBD".
    - Layout: Horizontal timeline or flowchart.
    - **CRITICAL: Ensure generous whitespace margins around all sides (top, bottom, left, right) so no text or graphic elements are cut off at the edges.**
  `;

  try {
    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio,
      }
    };

    // Only add imageSize for the pro model
    if (quality === 'pro') {
      config.imageConfig.imageSize = imageSize;
    }

    // Always use a fresh client to pick up any newly selected API keys
    const freshAi = getAiClient();
    const response = await freshAi.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: config
    });

    // Iterate through parts to find the image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response.");

  } catch (error: any) {
    console.error("Infographic Generation Failed:", error);
    throw new Error(error.message || "Failed to generate infographic.");
  }
};

export const editRunbookInfographic = async ({
  imageBase64,
  prompt,
  quality = 'fast',
  aspectRatio = '16:9'
}: {
  imageBase64: string;
  prompt: string;
  quality: 'fast' | 'pro';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
}): Promise<string> => {
  const modelId = quality === 'fast' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
  
  // Extract base64 data from data URL
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const mimeType = imageBase64.match(/^data:([^;]+);/)?.[1] || "image/png";

  try {
    // Always use a fresh client to pick up any newly selected API keys
    const freshAi = getAiClient();
    
    const response = await freshAi.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Edit the provided infographic based on this instruction: ${prompt}. Maintain the same scientific aesthetic and layout style.`
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response.");

  } catch (error: any) {
    console.error("Infographic Editing Failed:", error);
    throw new Error(error.message || "Failed to edit infographic.");
  }
};

export const cleanupSketchToDiagram = async ({
  imageBase64,
  mimeType,
  userIntent
}: {
  imageBase64: string;
  mimeType: string;
  userIntent?: string;
}): Promise<{ cleanedDiagramPng: string; questions: string[] }> => {
  const modelId = "gemini-2.5-flash-image";
  
  const promptText = `
    You are an expert scientific illustrator.
    Task: Redraw the provided handwritten sketch or layout into a clean, professional, high-contrast, vector-style diagram.
    
    Instructions:
    1. Preserve the layout, structure, and all readable text exactly.
    2. Style: White background, clean black lines, readable sans-serif text.
    3. If any text is illegible, do NOT guess. Replace it with "UNREADABLE" in the diagram.
    4. If there were unreadable parts or ambiguities, list them as text questions at the end of the response.
    
    User Context/Intent: ${userIntent || "None provided. Just clean up the diagram."}
  `;

  const parts = [
    {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64
      }
    },
    { text: promptText }
  ];

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      // Image generation usually doesn't use responseMimeType: application/json
      config: {
        imageConfig: {
          aspectRatio: "1:1" // Default square for generic sketches
        }
      }
    });

    let cleanedDiagramPng = "";
    let questions: string[] = [];
    let fullText = "";

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          cleanedDiagramPng = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          fullText += part.text;
        }
      }
    }

    if (!cleanedDiagramPng) {
      throw new Error("No diagram generated. Please try again.");
    }

    // Parse questions from text if any
    if (fullText) {
      // Split by newlines and filter for question-like sentences or bullets
      questions = fullText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && (line.endsWith('?') || line.toLowerCase().includes('unreadable')));
    }

    return { cleanedDiagramPng, questions };

  } catch (error: any) {
    console.error("Sketch Cleanup Failed:", error);
    throw new Error(error.message || "Failed to clean up diagram.");
  }
};

// --- Standards & Benchmarking ---

export const fetchReportingChecklist = async ({ guidelineType }: { guidelineType: string }): Promise<Checklist> => {
  const modelId = "gemini-3-pro-preview";
  // We cannot use responseSchema with Google Search, so we instruct the model to return JSON in text.
  const promptText = `
    You are a scientific standards expert.
    Search for the reporting guidelines for "${guidelineType}" (e.g. MIQE for qPCR, ARRIVE for animals, CONSORT for trials, etc).
    
    Goal: Create a structured checklist of requirements from this guideline.
    
    Output strictly in valid JSON format (do not use Markdown code blocks).
    Structure:
    {
      "checklistName": "Official name of guideline",
      "items": [
        {
          "id": "1a",
          "requirement": "Description of requirement",
          "whyItMatters": "Brief rationale",
          "severity": "Essential" | "Recommended"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    // Extract JSON from text (it might be wrapped in ```json ... ``` or just raw text)
    let jsonText = response.text || "";
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const checklist = JSON.parse(jsonText);

    // Extract citations from grounding metadata
    const citations: StandardCitation[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          citations.push({
            uri: chunk.web.uri,
            title: chunk.web.title || "Web Source"
          });
        }
      });
    }

    return {
      ...checklist,
      citations
    } as Checklist;

  } catch (error: any) {
    console.error("Fetch Checklist Failed:", error);
    throw new Error("Failed to fetch checklist. Please try again.");
  }
};

export const compareProtocolToChecklist = async ({ 
  checklistJson, 
  extractionJson 
}: { 
  checklistJson: Checklist, 
  extractionJson: ProtocolExtraction 
}): Promise<ChecklistComparisonResult> => {
  const modelId = "gemini-3-pro-preview";
  
  const promptText = `
    Compare the following scientific protocol extraction against the reporting checklist.
    
    Checklist:
    ${JSON.stringify(checklistJson)}
    
    Protocol Extraction:
    ${JSON.stringify(extractionJson)}
    
    For each item in the checklist, determine if it is "Covered", "Partial", or "Missing" in the protocol.
    Provide evidence quotes if covered, or fix suggestions if missing.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: comparisonSchema,
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from comparison model");
    return JSON.parse(text) as ChecklistComparisonResult;
  } catch (error: any) {
    console.error("Checklist Comparison Failed:", error);
    throw new Error("Failed to compare protocol.");
  }
};

let currentChat: Chat | null = null;

export const initializeChat = (input: FileInput) => {
  const modelId = "gemini-3-pro-preview";
  
  const systemInstruction = `
    You are a helpful lab assistant. 
    You have access to a specific scientific protocol provided by the user.
    
    Rules:
    - Answer questions ONLY based on the provided protocol content and the structured data extracted from it.
    - If the answer is not in the protocol, state clearly that it is missing from the provided text.
    - Do not hallucinate steps or reagents not mentioned.
    - CITATION RULE: When asserting facts from the protocol, you MUST provide a short quote or reference the specific section (e.g. "Section 2.1" or "Step 3").
    - Be concise and helpful.
  `;

  currentChat = ai.chats.create({
    model: modelId,
    config: { systemInstruction }
  });

  // Pre-load context into the chat history essentially by sending a message that sets the context, 
  // but we want this to be invisible or system-level. 
  // We will send the document as the first message "Here is the protocol context".
  
  const parts = [];
   if (input.type === 'pdf') {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: input.content
      }
    });
  } else {
    parts.push({ text: input.content });
  }
  parts.push({ text: "Here is the protocol context. Please acknowledge you have read it." });

  return currentChat.sendMessage({ message: parts });
};

export const updateChatWithExtraction = async (extraction: ProtocolExtraction) => {
  if (!currentChat) return;
  
  // Feed the structured extraction as a system-like message to improve reasoning
  await currentChat.sendMessage({
    message: `System Update: Here is the structured extraction of the protocol for your reference to help answer user questions more accurately:\n${JSON.stringify(extraction)}`
  });
};

export const sendMessageToChat = async (message: string): Promise<string> => {
  if (!currentChat) {
    throw new Error("Chat not initialized. Please upload a protocol first.");
  }
  const result = await currentChat.sendMessage({ message });
  return result.text || "I couldn't generate a response.";
};
