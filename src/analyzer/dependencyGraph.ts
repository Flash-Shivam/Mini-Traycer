import * as path from "path";
import {
  FileInfo,
  DependencyGraph,
  DependencyNode,
  ParsedFile,
} from "../types";
import { TypeScriptParser } from "./fileParser";
import { GoParser } from "./goParser";

export class DependencyGraphBuilder {
  private parsedFiles: Map<string, ParsedFile> = new Map();
  private graph: DependencyGraph = {
    nodes: new Map(),
    edges: new Map(),
    roots: new Set(),
    leaves: new Set(),
  };

  constructor(private workspaceRoot: string) {}

  async build(files: FileInfo[]): Promise<DependencyGraph> {
    // Parse all files
    for (const file of files) {
      try {
        const parsed = await this.parseFile(file);
        this.parsedFiles.set(file.absolutePath, parsed);
      } catch (error) {
        console.warn(`Failed to parse ${file.path}:`, error);
      }
    }

    // Build nodes
    for (const [filePath, parsed] of this.parsedFiles) {
      const node: DependencyNode = {
        filePath,
        relativePath: path.relative(this.workspaceRoot, filePath),
        parsed,
        dependsOn: new Set(),
        dependedBy: new Set(),
        depth: 0,
      };
      this.graph.nodes.set(filePath, node);
    }

    // Build edges
    for (const [filePath, parsed] of this.parsedFiles) {
      const node = this.graph.nodes.get(filePath)!;

      for (const imp of parsed.imports) {
        if (imp.resolvedPath && this.graph.nodes.has(imp.resolvedPath)) {
          node.dependsOn.add(imp.resolvedPath);

          const targetNode = this.graph.nodes.get(imp.resolvedPath)!;
          targetNode.dependedBy.add(filePath);

          if (!this.graph.edges.has(filePath)) {
            this.graph.edges.set(filePath, new Set());
          }
          this.graph.edges.get(filePath)!.add(imp.resolvedPath);
        }
      }
    }

    // Identify roots and leaves
    for (const [filePath, node] of this.graph.nodes) {
      if (node.dependsOn.size === 0) {
        this.graph.leaves.add(filePath);
      }
      if (node.dependedBy.size === 0) {
        this.graph.roots.add(filePath);
      }
    }

    this.calculateDepths();

    return this.graph;
  }

  private async parseFile(file: FileInfo): Promise<ParsedFile> {
    switch (file.language) {
      case "typescript":
      case "javascript":
        return new TypeScriptParser().parseFile(file.absolutePath);
      case "go":
        return new GoParser().parseFile(file.absolutePath);
      default:
        return {
          path: file.absolutePath,
          imports: [],
          exports: [],
          functions: [],
          classes: [],
        };
    }
  }

  private calculateDepths() {
    const visited = new Set<string>();

    const dfs = (filePath: string, depth: number) => {
      if (visited.has(filePath)) return;
      visited.add(filePath);

      const node = this.graph.nodes.get(filePath);
      if (!node) return;

      node.depth = Math.max(node.depth, depth);

      for (const dependentPath of node.dependedBy) {
        dfs(dependentPath, depth + 1);
      }
    };

    for (const leaf of this.graph.leaves) {
      dfs(leaf, 0);
    }
  }

  getTransitiveDependencies(filePath: string, maxDepth = 3): Set<string> {
    const deps = new Set<string>();
    const visited = new Set<string>();

    const traverse = (path: string, depth: number) => {
      if (depth > maxDepth || visited.has(path)) return;
      visited.add(path);

      const node = this.graph.nodes.get(path);
      if (!node) return;

      for (const dep of node.dependsOn) {
        deps.add(dep);
        traverse(dep, depth + 1);
      }
    };

    traverse(filePath, 0);
    return deps;
  }

  getImpactRadius(filePath: string): Set<string> {
    const affected = new Set<string>();
    const visited = new Set<string>();

    const traverse = (path: string) => {
      if (visited.has(path)) return;
      visited.add(path);

      const node = this.graph.nodes.get(path);
      if (!node) return;

      for (const dependent of node.dependedBy) {
        affected.add(dependent);
        traverse(dependent);
      }
    };

    traverse(filePath);
    return affected;
  }
}
