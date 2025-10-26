import OpenAI from "openai";
import fetch from "node-fetch"; // Make sure to npm install node-fetch

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMClient {
  chat(messages: Message[]): Promise<string>;
}

// ----- OpenAI Client -----
export class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: Message[]): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000,
      });
      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }
}

// ----- Anthropic Claude Client -----
export class ClaudeClient implements LLMClient {
  constructor(private apiKey: string) {}

  async chat(messages: Message[]): Promise<string> {
    // Convert to Claude's API format
    const systemPrompt =
      messages.find((m) => m.role === "system")?.content ?? "";
    const userPrompt = messages.find((m) => m.role === "user")?.content ?? "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        system: systemPrompt, // <--- set system prompt here
        max_tokens: 2000,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    // Adapt result for Claude v1 API
    // Find assistant's reply in result.content (it's an array of message blocks)
    const content = data?.content?.[0]?.text || "";
    return content;
  }
}

// ----- Mock Client -----
export class MockLLMClient implements LLMClient {
  async chat(messages: Message[]): Promise<string> {
    // Mock response for testing
    return JSON.stringify({
      phases: [
        {
          id: "phase-1",
          title: "Setup Test File",
          description: "Create test file structure",
          dependencies: [],
        },
      ],
      filePlans: [
        {
          filePath: "test/example.test.ts",
          action: "create",
          changes: [
            {
              type: "add_function",
              location: "top",
              code: 'describe("test suite", () => {})',
              description: "Add test suite",
            },
          ],
          reasoning: "Need test coverage",
        },
      ],
      estimatedComplexity: "low",
    });
  }
}
