export interface ProtocolExtraction {
  doc_title: string | null;
  experiment_template: "general" | "cell_culture" | "sequencing" | "microscopy" | "crispr" | "other";
  organisms_or_samples: string[];
  objective: string | null;

  materials: Array<{
    name: string;
    category: "reagent" | "equipment" | "software" | "consumable" | "other";
    vendor: string | null;
    identifier: string | null; // catalog/RRID/version/etc
    notes: string | null;
    evidence: Array<{ quote: string; location: string | null }>;
  }>;

  steps: Array<{
    step_id: string;
    phase: string | null;
    action: string;
    parameters: {
      time: string | null;
      temperature: string | null;
      volume: string | null;
      concentration: string | null;
      speed: string | null;
      other: string | null;
    };
    notes: string | null;
    evidence: Array<{ quote: string; location: string | null }>;
  }>;

  controls_and_replicates: Array<{
    type: string;
    description: string;
    evidence: Array<{ quote: string; location: string | null }>;
  }>;

  qc_checks: Array<{
    measurement: string;
    acceptance_criteria: string | null;
    when: string | null;
    evidence: Array<{ quote: string; location: string | null }>;
  }>;

  analysis: {
    software: Array<{ name: string; version: string | null; evidence: Array<{ quote: string; location: string | null }> }>;
    stats: Array<{ test: string; details: string | null; evidence: Array<{ quote: string; location: string | null }> }>;
  };

  ambiguities: Array<{ text: string; reason: string; evidence: Array<{ quote: string; location: string | null }> }>;
  missing_fields: Array<{ field: string; severity: "blocker" | "major" | "minor"; why_it_matters: string }>;
  contradictions: Array<{ description: string; evidence: Array<{ quote: string; location: string | null }> }>;
}

export interface ReproScore {
  total: number; // 0-100
  subscores: {
    materials: number;
    parameters: number;
    controls: number;
    qc: number;
    analysis: number;
    ambiguityPenalty: number;
  };
  topIssues: Array<{
    severity: "blocker" | "major" | "minor";
    title: string;
    details: string;
    linkedField: string;
  }>;
}

export interface ReproducibilityCritique {
  prioritized_questions: Array<{
    severity: "blocker" | "major" | "minor";
    question: string;
    rationale: string;
  }>;
  suggested_fixes: Array<{
    severity: "blocker" | "major" | "minor";
    fix_text: string;
    rationale: string;
  }>;
}
