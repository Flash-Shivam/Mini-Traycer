import { ImplementationPlan, FileDiff, ValidationResult } from "../types";

export class PlanValidator {
  async validateImplementation(
    plan: ImplementationPlan,
    diffs: FileDiff[]
  ): Promise<ValidationResult> {
    // Simplified validation - in production use LLM comparison
    const mismatches = [];
    const suggestions = [];

    const plannedFiles = new Set(plan.filePlans.map((fp) => fp.filePath));
    const actualFiles = new Set(diffs.map((d) => d.filePath));

    for (const planned of plannedFiles) {
      if (!actualFiles.has(planned)) {
        mismatches.push({
          filePath: planned,
          expected: plan.filePlans.find((fp) => fp.filePath === planned)!
            .changes[0],
          actual: "File not modified",
          severity: "error" as const,
        });
      }
    }

    const isValid = mismatches.length === 0;

    if (!isValid) {
      suggestions.push(
        "Some planned files were not modified. Review the implementation."
      );
    }

    return { isValid, mismatches, suggestions };
  }
}
