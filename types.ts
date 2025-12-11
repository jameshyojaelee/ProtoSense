
import { ReproducibilityCritique } from "./types/protocol";

export enum ExperimentTemplate {
  GENERAL = 'General Wet Lab',
  CELL_CULTURE = 'Cell Culture',
  SEQUENCING = 'Sequencing (NGS/Sanger)',
  MICROSCOPY = 'Microscopy/Imaging',
}

export interface SubScore {
  category: string;
  score: number; // 0-100
  comment: string;
}

export type Severity = 'Blocker' | 'Major' | 'Minor';

export interface Issue {
  severity: Severity;
  description: string;
  missing_field: string | null;
  evidence_quote: string | null;
  fix_suggestion: string;
}

export interface RunbookStep {
  step_number: number;
  instruction: string;
  duration_estimate: string | null;
  critical_hazards: string[];
  reagents_needed: string[];
}

export interface SimulationLog {
  stepId: number;
  action: string;
  status: 'Success' | 'Warning' | 'Critical Failure';
  simulation_note: string; // The "thought process" of the robot
  state_change: string; // e.g. "Pellet is now suspended"
}

export interface MaterialValidation {
  material_name: string;
  catalog_number: string | null;
  status: 'Verified' | 'Not Found' | 'Discontinued' | 'Ambiguous';
  search_finding: string;
}

// --- New Statistical Types ---
export interface StatisticalFinding {
  aspect: 'Sample Size (n)' | 'Statistical Test' | 'Replicates' | 'Power Analysis';
  status: 'Robust' | 'Warning' | 'Critical' | 'Unknown';
  observation: string;
  recommendation: string;
}

export interface StatisticalAnalysisResult {
  summary: string;
  findings: StatisticalFinding[];
}

export interface ConsistencyCheckResult {
  timeline_minutes_estimate: number;
  timeline_explanation: string;
  flagged_inconsistencies: string[];
  computed_dilutions: Array<{
    reagent: string;
    calculation: string;
    instruction: string;
  }>;
}

export interface DeepAnalysisResult {
  simulation_logs: SimulationLog[];
  material_validations: MaterialValidation[];
  statistical_analysis: StatisticalAnalysisResult;
}

export interface AnalysisResult {
  overall_score: number;
  sub_scores: SubScore[];
  issues: Issue[];
  runbook: RunbookStep[];
  methods_patch_summary: string;
  critique?: ReproducibilityCritique;
  runbook_markdown?: string;
  patch_markdown?: string;
  consistency_check?: ConsistencyCheckResult;
  deep_analysis?: DeepAnalysisResult;
}

export interface FileInput {
  type: 'text' | 'pdf';
  content: string; // Text content or Base64 string
  name?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- Standards & Checklists ---

export interface ChecklistItem {
  id: string;
  requirement: string;
  whyItMatters: string;
  severity: 'Essential' | 'Recommended';
}

export interface StandardCitation {
  uri: string;
  title: string;
}

export interface Checklist {
  checklistName: string;
  items: ChecklistItem[];
  citations: StandardCitation[];
}

export interface ChecklistComparisonItem {
  itemId: string;
  requirement: string;
  status: 'Covered' | 'Partial' | 'Missing';
  evidence: string | null; // Quote or explanation
  fixSuggestion: string | null;
}

export interface ChecklistComparisonResult {
  checklistName: string;
  items: ChecklistComparisonItem[];
}
