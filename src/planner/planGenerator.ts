import { Phase, RelevantContext, ImplementationPlan, FilePlan } from "../types";
import { LLMClient, Message } from "./llmClient";

export class PlanGenerator {
  constructor(private llmClient: LLMClient) {}

  async generatePlan(
    phases: Phase[],
    context: RelevantContext,
    task: string
  ): Promise<ImplementationPlan> {
    const prompt = this.buildPrompt(phases, context, task);

    const messages: Message[] = [
      {
        role: "system",
        content:
          "You are a senior software architect. Generate detailed, file-level implementation plans.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await this.llmClient.chat(messages);
    console.log(response);
    const jsonBlock = this.extractFirstJsonBlock(response);
    console.log(jsonBlock);

    try {
      if (jsonBlock) {
        const parsed = JSON.parse(jsonBlock);
        return {
          phases,
          filePlans: parsed.filePlans || [],
          sequenceDiagram: parsed.sequenceDiagram,
          estimatedComplexity: parsed.estimatedComplexity || "medium",
        };
      } else {
        throw new Error("No JSON block found in LLM response");
      }
    } catch (error) {
      console.error("Failed to parse plan:", error);
      return this.createFallbackPlan(phases);
    }
  }

  private buildPrompt(
    phases: Phase[],
    context: RelevantContext,
    task: string
  ): string {
    return `Task: ${task}

Phases:
${phases.map((p, i) => `${i + 1}. ${p.title}: ${p.description}`).join("\n")}

Codebase Context:
Primary Files:
${context.primaryFiles
  .map(
    (f) => `
- ${f.relativePath}
  Functions: ${f.parsed.functions.map((fn) => fn.name).join(", ")}
  Exports: ${f.parsed.exports.map((e) => e.name).join(", ")}
`
  )
  .join("\n")}

Generate a detailed implementation plan. Return JSON:
{
  "filePlans": [
    {
      "filePath": "path/to/file.ts",
      "action": "create" | "modify" | "delete",
      "changes": [
        {
          "type": "add_function" | "modify_function" | "add_import",
          "location": "line number or function name",
          "code": "actual code",
          "description": "what this does"
        }
      ],
      "reasoning": "why these changes"
    }
  ],
  "sequenceDiagram": "mermaid syntax (optional)",
  "estimatedComplexity": "low" | "medium" | "high"
}`;
  }

  private createFallbackPlan(phases: Phase[]): ImplementationPlan {
    return {
      phases,
      filePlans: [],
      estimatedComplexity: "medium",
    };
  }

  private extractFirstJsonBlock(text: string): string | null {
    // Find the first opening brace
    const startIdx = text.indexOf("{");
    if (startIdx === -1) return null;

    // Count braces to find the matching closing brace
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < text.length; i++) {
      const char = text[i];

      // Handle escape sequences in strings
      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      // Track if we're inside a string (don't count braces in strings)
      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          // Found the matching closing brace
          if (braceCount === 0) {
            return text.substring(startIdx, i + 1);
          }
        }
      }
    }

    return null; // No matching closing brace found
  }
}
