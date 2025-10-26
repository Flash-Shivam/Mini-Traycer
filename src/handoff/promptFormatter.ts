import { ImplementationPlan } from "../types";

export class PromptFormatter {
  formatForCursor(plan: ImplementationPlan): string {
    let prompt = "# Implementation Task\n\n";

    plan.phases.forEach((phase, i) => {
      prompt += `## Phase ${i + 1}: ${phase.title}\n`;
      prompt += `${phase.description}\n\n`;

      const phasePlans = plan.filePlans;
      phasePlans.forEach((fp) => {
        prompt += `### File: ${fp.filePath} (${fp.action})\n`;
        prompt += `${fp.reasoning}\n\n`;
        prompt += "Changes:\n";
        fp.changes.forEach((change) => {
          prompt += `- ${change.description} (${change.type} at ${change.location})\n`;
          prompt += `\`\`\`\n${change.code}\n\`\`\`\n\n`;
        });
      });
    });

    return prompt;
  }

  formatForGeneric(plan: ImplementationPlan): string {
    return this.formatForCursor(plan);
  }
}
