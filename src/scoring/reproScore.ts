import { ProtocolExtraction, ReproScore } from "../../types/protocol";

export const calculateReproScore = (data: ProtocolExtraction): ReproScore => {
  // 1. Materials Score: Fraction of materials with vendor or identifier
  let materialsScore = 0;
  if (data.materials.length > 0) {
    const identifiableMaterials = data.materials.filter(
      (m) => m.vendor !== null || m.identifier !== null
    );
    materialsScore = Math.round((identifiableMaterials.length / data.materials.length) * 100);
  }

  // 2. Parameters Score: Fraction of steps with >=2 parameters populated
  let parametersScore = 0;
  if (data.steps.length > 0) {
    const detailedSteps = data.steps.filter((step) => {
      const params = step.parameters;
      const populatedCount = [
        params.time,
        params.temperature,
        params.volume,
        params.concentration,
        params.speed,
        params.other
      ].filter((p) => p !== null).length;
      return populatedCount >= 2;
    });
    parametersScore = Math.round((detailedSteps.length / data.steps.length) * 100);
  }

  // 3. Controls Score: 100 if controls exist and mention replicates
  let controlsScore = 0;
  if (data.controls_and_replicates.length > 0) {
    const hasReplicates = data.controls_and_replicates.some(
      (c) =>
        c.description.toLowerCase().includes("replicate") ||
        c.description.toLowerCase().includes("triplicate") ||
        c.description.toLowerCase().includes("duplicate") ||
        c.type.toLowerCase().includes("replicate") ||
        c.description.includes("n=")
    );
    controlsScore = hasReplicates ? 100 : 50; // Partial credit if controls exist but no replicate detail
  }

  // 4. QC Score: 100 if QC checks exist with acceptance criteria
  let qcScore = 0;
  if (data.qc_checks.length > 0) {
    const hasCriteria = data.qc_checks.some((qc) => qc.acceptance_criteria !== null);
    qcScore = hasCriteria ? 100 : 50;
  }

  // 5. Analysis Score: 100 if software exists with version
  let analysisScore = 0;
  if (data.analysis.software.length > 0) {
    const hasVersion = data.analysis.software.some((s) => s.version !== null);
    analysisScore = hasVersion ? 100 : 50;
  }

  // 6. Ambiguity Penalty: -2 per ambiguity, max -10
  const ambiguityPenalty = Math.max(-10, data.ambiguities.length * -2);

  // Calculate Total
  // Simple average of the 5 categories + penalty
  const categories = [materialsScore, parametersScore, controlsScore, qcScore, analysisScore];
  const rawTotal =
    categories.reduce((sum, val) => sum + val, 0) / categories.length + ambiguityPenalty;
  
  const total = Math.max(0, Math.min(100, Math.round(rawTotal)));

  // Top Issues
  // Map missing_fields and ambiguities to issues
  const missingFieldIssues = data.missing_fields.map((f) => ({
    severity: f.severity,
    title: `Missing: ${f.field}`,
    details: f.why_it_matters,
    linkedField: f.field
  }));

  const ambiguityIssues = data.ambiguities.map((a) => ({
    severity: "major" as const,
    title: "Ambiguous Instruction",
    details: `${a.text} - ${a.reason}`,
    linkedField: "procedure"
  }));

  const allIssues = [...missingFieldIssues, ...ambiguityIssues];
  
  // Sort by severity (Blocker > Major > Minor)
  const severityWeight = { blocker: 3, major: 2, minor: 1 };
  allIssues.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

  return {
    total,
    subscores: {
      materials: materialsScore,
      parameters: parametersScore,
      controls: controlsScore,
      qc: qcScore,
      analysis: analysisScore,
      ambiguityPenalty
    },
    topIssues: allIssues.slice(0, 5)
  };
};
