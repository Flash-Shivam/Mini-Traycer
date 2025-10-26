import * as path from "path";
import * as fs from "fs";
import { ParsedFile, ImportInfo, FunctionInfo } from "../types";

export class GoParser {
  parseFile(filePath: string): ParsedFile {
    const content = fs.readFileSync(filePath, "utf-8");
    const imports: ImportInfo[] = [];
    const functions: FunctionInfo[] = [];

    const importingDir = path.dirname(filePath);

    // Parse import blocks
    const importBlockRegex = /import\s*\(([^)]+)\)/gs;
    const importMatches = content.matchAll(importBlockRegex);

    for (const match of importMatches) {
      const block = match[1];
      const lineRegex = /(?:(\w+)\s+)?"([^"]+)"/g;
      const lines = block.matchAll(lineRegex);

      for (const line of lines) {
        const alias = line[1];
        const packagePath = line[2];

        let resolvedPath: string | undefined = undefined;
        if (packagePath.startsWith(".")) {
          // Try to resolve as a file: "./foo.go"
          const fileCandidate = path.resolve(importingDir, packagePath + ".go");
          if (fs.existsSync(fileCandidate)) {
            resolvedPath = fileCandidate;
          } else {
            // Try as a directory: "./foo/somefile.go"
            const dirCandidate = path.resolve(importingDir, packagePath);
            if (
              fs.existsSync(dirCandidate) &&
              fs.statSync(dirCandidate).isDirectory()
            ) {
              const goFiles = fs
                .readdirSync(dirCandidate)
                .filter((f) => f.endsWith(".go"))
                .map((f) => path.join(dirCandidate, f));
              if (goFiles.length > 0) {
                resolvedPath = goFiles[0]; // Pick first file; or collect all if you want
              }
            }
          }
        }

        imports.push({
          moduleName: packagePath,
          resolvedPath,
          importedNames: alias ? [alias] : [],
          isExternal: !packagePath.startsWith("."),
        });
      }
    }

    // Parse single-line imports
    const singleImportRegex = /import\s+"([^"]+)"/g;
    const singleMatches = content.matchAll(singleImportRegex);

    for (const match of singleMatches) {
      const packagePath = match[1];
      let resolvedPath: string | undefined = undefined;
      if (packagePath.startsWith(".")) {
        const fileCandidate = path.resolve(importingDir, packagePath + ".go");
        if (fs.existsSync(fileCandidate)) {
          resolvedPath = fileCandidate;
        } else {
          const dirCandidate = path.resolve(importingDir, packagePath);
          if (
            fs.existsSync(dirCandidate) &&
            fs.statSync(dirCandidate).isDirectory()
          ) {
            const goFiles = fs
              .readdirSync(dirCandidate)
              .filter((f) => f.endsWith(".go"))
              .map((f) => path.join(dirCandidate, f));
            if (goFiles.length > 0) {
              resolvedPath = goFiles[0];
            }
          }
        }
      }
      imports.push({
        moduleName: packagePath,
        resolvedPath,
        importedNames: [],
        isExternal: !packagePath.startsWith("."),
      });
    }

    // Parse functions
    const funcRegex = /func\s+(\w+)\s*\(/g;
    let funcMatch;
    while ((funcMatch = funcRegex.exec(content)) !== null) {
      functions.push({
        name: funcMatch[1],
        parameters: [],
        lineNumber: content.substring(0, funcMatch.index).split("\n").length,
      });
    }

    return {
      path: filePath,
      imports,
      exports: [],
      functions,
      classes: [],
    };
  }
}
