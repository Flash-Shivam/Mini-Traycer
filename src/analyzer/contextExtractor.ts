import { DependencyGraph, DependencyNode, RelevantContext } from "../types";
import { DependencyGraphBuilder } from "./dependencyGraph";

export class ContextExtractor {
  constructor(
    private graph: DependencyGraph,
    private graphBuilder: DependencyGraphBuilder
  ) {}

  async extractForTask(taskQuery: string): Promise<RelevantContext> {
    const keywords = this.extractKeywords(taskQuery);
    const scoredNodes = this.scoreNodesByRelevance(keywords);

    const primaryFiles = scoredNodes
      .slice(0, 5)
      .map((s) => this.graph.nodes.get(s.path)!)
      .filter(Boolean);

    const secondaryPaths = new Set<string>();
    for (const file of primaryFiles) {
      const deps = this.graphBuilder.getTransitiveDependencies(
        file.filePath,
        2
      );
      deps.forEach((d) => secondaryPaths.add(d));
    }

    const secondaryFiles = Array.from(secondaryPaths)
      .map((p) => this.graph.nodes.get(p)!)
      .filter(Boolean);

    const externalDeps = new Set<string>();
    [...primaryFiles, ...secondaryFiles].forEach((node) => {
      node.parsed.imports
        .filter((imp) => imp.isExternal)
        .forEach((imp) => externalDeps.add(imp.moduleName));
    });

    return {
      primaryFiles,
      secondaryFiles,
      externalDeps,
      summary: this.generateSummary(primaryFiles, secondaryFiles),
    };
  }

  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      "the",
      "a",
      "to",
      "for",
      "in",
      "on",
      "add",
      "write",
      "create",
    ]);
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => !stopWords.has(word) && word.length > 2);
  }

  private scoreNodesByRelevance(
    keywords: string[]
  ): Array<{ path: string; score: number }> {
    const scores: Array<{ path: string; score: number }> = [];

    for (const [filePath, node] of this.graph.nodes) {
      let score = 0;
      const content = [
        node.relativePath,
        ...node.parsed.functions.map((f) => f.name),
        ...node.parsed.classes.map((c) => c.name),
        ...node.parsed.exports.map((e) => e.name),
      ]
        .join(" ")
        .toLowerCase();

      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          score += 10;
        }
      }

      scores.push({ path: filePath, score });
    }

    return scores.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  }

  private generateSummary(
    primary: DependencyNode[],
    secondary: DependencyNode[]
  ): string {
    return `Found ${primary.length} primary files:
${primary.map((n) => `- ${n.relativePath}`).join("\n")}

With ${secondary.length} dependencies:
${secondary
  .slice(0, 10)
  .map((n) => `- ${n.relativePath}`)
  .join("\n")}
${secondary.length > 10 ? `... and ${secondary.length - 10} more` : ""}`.trim();
  }
}
