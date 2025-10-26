import { Phase, RelevantContext } from "../types";
import { LLMClient, Message } from "./llmClient";

export class TaskBreakdown {
  constructor(private llmClient: LLMClient) {}

  async breakIntoPhases(
    task: string,
    context: RelevantContext
  ): Promise<Phase[]> {
    const prompt = this.buildPrompt(task, context);

    const messages: Message[] = [
      {
        role: "system",
        content:
          "You are a senior software architect. Break down tasks into clear, sequential phases.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await this.llmClient.chat(messages);

    const jsonBlock = this.extractFirstJsonBlock(response);

    try {
      if (jsonBlock) {
        const parsed = JSON.parse(jsonBlock);
        return parsed.phases || []; // can also handle filePlans, etc.
      } else {
        throw new Error("No JSON block found in response");
      }
    } catch (error) {
      console.error("Failed to parse phases:", error);
      return this.createFallbackPhases(task);
    }
  }

  private buildPrompt(task: string, context: RelevantContext): string {
    return `Task: ${task}

Relevant Files:
${context.primaryFiles.map((f) => `- ${f.relativePath}`).join("\n")}

External Dependencies:
${Array.from(context.externalDeps).slice(0, 10).join(", ")}

Break this task into 2-4 sequential phases. Return JSON:
{
  "phases": [
    {
      "id": "phase-1",
      "title": "Phase Title",
      "description": "What to do",
      "dependencies": []
    }
  ]
}`;
  }

  private createFallbackPhases(task: string): Phase[] {
    return [
      {
        id: "phase-1",
        title: "Implementation",
        description: task,
        dependencies: [],
      },
    ];
  }

  private extractFirstJsonBlock(text: string): string | null {
    // Matches the *first complete JSON block*, including nested braces
    const match = text.match(/\{(?:[^{}]|(?<rec>\{(?:[^{}]|(?:rec))*\}))*\}/);
    return match ? match[0] : null;
  }
}
