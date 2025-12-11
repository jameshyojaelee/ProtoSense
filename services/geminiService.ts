
import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AnalysisResult, ConsistencyCheckResult, DeepAnalysisResult, ExperimentTemplate, FileInput, Issue, Checklist, ChecklistComparisonResult, StandardCitation, SimulationLog, MaterialValidation, StatisticalAnalysisResult } from "../types";
import { ProtocolExtraction, ReproScore, ReproducibilityCritique } from "../types/protocol";

// Helper to get a fresh client (important for dynamic API key updates in AI Studio)
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;

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

const statisticalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Executive summary of statistical rigor." },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          aspect: { type: Type.STRING, enum: ["Sample Size (n)", "Statistical Test", "Replicates", "Power Analysis"] },
          status: { type: Type.STRING, enum: ["Robust", "Warning", "Critical", "Unknown"] },
          observation: { type: Type.STRING, description: "What was found in the text." },
          recommendation: { type: Type.STRING, description: "How to fix the statistical flaw." }
        },
        required: ["aspect", "status", "observation", "recommendation"]
      }
    }
  },
  required: ["summary", "findings"]
};

// Schema for checklist fetching
const checklistSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    checklistName: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          requirement: { type: Type.STRING },
          whyItMatters: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["Essential", "Recommended"] }
        },
        required: ["id", "requirement", "whyItMatters", "severity"]
      }
    },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          uri: { type: Type.STRING },
          title: { type: Type.STRING }
        },
        required: ["uri", "title"]
      }
    }
  },
  required: ["checklistName", "items", "citations"]
};


export const analyzeProtocol = async (
  input: FileInput,
  template: ExperimentTemplate
): Promise<AnalysisResult> => {
  const ai = getAiClient();
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
  const ai = getAiClient();
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
  const ai = getAiClient();
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
  const ai = getAiClient();
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
  const ai = getAiClient();
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
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash"; // Reliable reasoning model
  const promptText = `
    You are a computational biologist.
    Here is a structured protocol extraction: ${JSON.stringify(extractionJson)}
    
    Perform the following calculations and checks mentally:
    1. Estimate total time in minutes by parsing 'time' parameters in the 'steps' array (convert '1 hr' to 60, 'overnight' to 960, etc.). Sum them up. Return 0 if no time info is found.
    2. Check for unit inconsistencies (e.g. uL vs ml mixed without logic, or mass vs volume ambiguity) in parameters.
    3. Identify steps that mention a concentration parameter where a dilution calculation might be needed (e.g. "Add 50 ug/mL X to Y"). If a dilution seems implied, calculate an example volume (assume 100uL total volume if unknown).

    Return a valid JSON response strictly matching this schema:
    {
      "timeline_minutes_estimate": number,
      "timeline_explanation": string,
      "flagged_inconsistencies": string[],
      "computed_dilutions": [{"reagent": string, "calculation": string, "instruction": string}]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: consistencySchema,
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
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";
  
  const promptText = `
    Act as a "Virtual Laboratory Robot". You are attempting to physically execute this protocol based ONLY on the provided JSON.
    
    Protocol: ${JSON.stringify(extractionJson)}
    
    Task:
    Go through the steps 1 by 1.
    For each step, simulate the physical action.
    - If a volume is missing, you cannot proceed safely -> Log "Critical Failure" or "Warning".
    - If a container type is not specified (e.g. "Transfer to tube" but doesn't say 1.5ml or 15ml), Log "Warning".
    - If logic flows correctly, Log "Success" and update the state (e.g. "Sample is now in pellet").
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
  const ai = getAiClient();
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

export const runStatisticalAnalysis = async ({
  extractionJson
}: {
  extractionJson: ProtocolExtraction
}): Promise<StatisticalAnalysisResult> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";

  const promptText = `
    Act as a Senior Biostatistician. Review this protocol for statistical rigor.
    
    Focus Areas:
    1. Sample Size (n): Is it explicitly stated? Is it sufficient?
    2. Statistical Tests: Are specific tests (t-test, ANOVA) named? Are they appropriate for the described experiment design?
    3. Replicates: Does it distinguish between technical replicates (same tube) vs biological replicates (different animals/cultures)?
    4. Power Analysis: Is there any mention of power calculation?

    Protocol Data:
    Controls/Replicates: ${JSON.stringify(extractionJson.controls_and_replicates)}
    Analysis Section: ${JSON.stringify(extractionJson.analysis)}
    Steps: ${JSON.stringify(extractionJson.steps)}
    
    Output strictly in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: statisticalSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from statistical analysis model");
    return JSON.parse(text) as StatisticalAnalysisResult;

  } catch (error: any) {
    console.error("Statistical Analysis Failed:", error);
    throw new Error("Failed to run statistical analysis.");
  }
};

export const runDeepAnalysis = async ({
  extractionJson
}: {
  extractionJson: ProtocolExtraction
}): Promise<DeepAnalysisResult> => {
  // Run agents sequentially to avoid rate limits and improve stability during demo
  
  let simulationLogs: SimulationLog[] = [];
  try {
    simulationLogs = await runVirtualSimulation({ extractionJson });
  } catch (e) {
    console.warn("Virtual Simulation Agent failed:", e);
    // Add a fallback error log for UI
    simulationLogs = [{
       stepId: 0,
       action: "Agent Error",
       status: "Critical Failure",
       simulation_note: "The virtual simulation agent encountered an error or timeout.",
       state_change: "Unknown"
    }];
  }

  let materialValidations: MaterialValidation[] = [];
  try {
    materialValidations = await validateMaterials({ extractionJson });
  } catch (e) {
    console.warn("Material Validation Agent failed:", e);
  }

  let statisticalAnalysis: StatisticalAnalysisResult = { 
     summary: "Statistical analysis agent encountered an error.", 
     findings: [] 
  };
  try {
    statisticalAnalysis = await runStatisticalAnalysis({ extractionJson });
  } catch (e) {
    console.warn("Statistical Analysis Agent failed:", e);
  }

  return {
    simulation_logs: simulationLogs,
    material_validations: materialValidations,
    statistical_analysis: statisticalAnalysis
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
  const ai = getAiClient();
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

export const initializeChat = async (input: FileInput): Promise<void> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash";
  
  // Basic system instruction
  const systemInstruction = `You are ProtoSense, an expert scientific reproducibility assistant. 
  You help scientists refine their methods sections. 
  You have access to the user's uploaded protocol. Answer questions about it, clarify ambiguities, and explain scientific standards.
  Be concise, professional, and helpful.`;

  chatSession = ai.chats.create({
    model: modelId,
    config: {
      systemInstruction,
    }
  });

  const parts = [];
  if (input.type === 'pdf') {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: input.content
        }
      });
      parts.push({ text: "Here is the protocol PDF I am working on." });
  } else {
      parts.push({ text: `Here is the protocol text:\n${input.content}` });
  }

  // Send the initial document
  await chatSession.sendMessage({ message: parts });
};

export const sendMessageToChat = async (message: string): Promise<string> => {
  if (!chatSession) throw new Error("Chat not initialized");
  const result = await chatSession.sendMessage({ message });
  return result.text;
};

export const updateChatWithExtraction = async (extraction: ProtocolExtraction): Promise<void> => {
  if (!chatSession) return;
  const prompt = `Here is the structured extraction of the protocol data. Use this to understand specific details like missing fields, steps, and materials:\n${JSON.stringify(extraction)}`;
  await chatSession.sendMessage({ message: prompt });
};

export const fetchReportingChecklist = async ({ guidelineType }: { guidelineType: string }): Promise<Checklist> => {
    const ai = getAiClient();
    const modelId = "gemini-3-pro-preview";
    const prompt = `
      Find the official reporting checklist guidelines for: ${guidelineType}.
      Examples include MIQE for qPCR, ARRIVE for animal studies, etc.
      
      Extract the key requirements into a structured checklist.
      Include citations to the official publication or website.
    `;
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: checklistSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text) as Checklist;
};

export const compareProtocolToChecklist = async ({ checklistJson, extractionJson }: { checklistJson: Checklist, extractionJson: ProtocolExtraction }): Promise<ChecklistComparisonResult> => {
    const ai = getAiClient();
    const modelId = "gemini-3-pro-preview";
    const prompt = `
      Compare the provided Protocol Extraction against the Reporting Checklist.
      
      Checklist: ${JSON.stringify(checklistJson)}
      Protocol: ${JSON.stringify(extractionJson)}
      
      For each checklist item, determine if the protocol covers it.
      - Covered: Explicitly mentioned.
      - Partial: Vaguely mentioned.
      - Missing: Not found.
      
      Provide evidence quotes or fix suggestions.
    `;
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: comparisonSchema, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text) as ChecklistComparisonResult;
};
