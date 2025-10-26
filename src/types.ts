// Common types used across the project

export interface FileInfo {
  path: string;
  absolutePath: string;
  language: string;
  size: number;
}

export interface ImportInfo {
  moduleName: string;
  resolvedPath?: string;
  importedNames: string[];
  isExternal: boolean;
}

export interface ExportInfo {
  name: string;
  type: "function" | "class" | "variable" | "type";
}

export interface FunctionInfo {
  name: string;
  parameters: string[];
  returnType?: string;
  lineNumber: number;
}

export interface ClassInfo {
  name: string;
  methods: string[];
  lineNumber: number;
}

export interface ParsedFile {
  path: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

export interface DependencyNode {
  filePath: string;
  relativePath: string;
  parsed: ParsedFile;
  dependsOn: Set<string>;
  dependedBy: Set<string>;
  depth: number;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>;
  roots: Set<string>;
  leaves: Set<string>;
}

export interface RelevantContext {
  primaryFiles: DependencyNode[];
  secondaryFiles: DependencyNode[];
  externalDeps: Set<string>;
  summary: string;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
}

export interface Change {
  type: "add_function" | "modify_function" | "add_import" | "update_config";
  location: string;
  code: string;
  description: string;
}

export interface FilePlan {
  filePath: string;
  action: "create" | "modify" | "delete";
  changes: Change[];
  reasoning: string;
}

export interface ImplementationPlan {
  phases: Phase[];
  filePlans: FilePlan[];
  sequenceDiagram?: string;
  estimatedComplexity: "low" | "medium" | "high";
}

export interface ValidationResult {
  isValid: boolean;
  mismatches: Mismatch[];
  suggestions: string[];
}

export interface Mismatch {
  filePath: string;
  expected: Change;
  actual: string;
  severity: "error" | "warning";
}

export interface FileDiff {
  filePath: string;
  additions: string[];
  deletions: string[];
  modified: string[];
}
