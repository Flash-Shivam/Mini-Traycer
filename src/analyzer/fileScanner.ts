import * as vscode from "vscode";
import * as glob from "glob";
import * as path from "path";
import * as fs from "fs";
import { FileInfo } from "../types";

export class FileScanner {
  private excludePatterns = [
    "node_modules",
    "dist",
    "out",
    "build",
    ".git",
    ".vscode",
    "coverage",
    "__pycache__",
  ];

  constructor(private workspaceRoot: string) {}

  async discoverFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    const patterns = [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.go",
      "**/*.py",
    ];

    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        cwd: this.workspaceRoot,
        ignore: this.excludePatterns.map((p) => `**/${p}/**`),
      });

      for (const relativePath of matches) {
        const absolutePath = path.join(this.workspaceRoot, relativePath);

        try {
          const stats = fs.statSync(absolutePath);
          files.push({
            path: relativePath,
            absolutePath,
            language: this.getLanguage(relativePath),
            size: stats.size,
          });
        } catch (error) {
          console.warn(`Failed to stat file ${absolutePath}:`, error);
        }
      }
    }

    return files;
  }

  private getLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      ".ts": "typescript",
      ".tsx": "typescript",
      ".js": "javascript",
      ".jsx": "javascript",
      ".go": "go",
      ".py": "python",
    };
    return langMap[ext] || "unknown";
  }

  setExcludePatterns(patterns: string[]) {
    this.excludePatterns = patterns;
  }
}
