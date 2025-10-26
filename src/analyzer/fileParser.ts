import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import {
  ParsedFile,
  ImportInfo,
  ExportInfo,
  FunctionInfo,
  ClassInfo,
} from "../types";

export class TypeScriptParser {
  parseFile(filePath: string): ParsedFile {
    const sourceCode = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const functions: FunctionInfo[] = [];
    const classes: ClassInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.extractImport(node, filePath);
        imports.push(importInfo);
      }

      if (this.hasExportModifier(node)) {
        const exportInfo = this.extractExport(node);
        if (exportInfo) {
          exports.push(exportInfo);
        }
      }

      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push({
          name: node.name.text,
          parameters: node.parameters.map((p) => p.name.getText(sourceFile)),
          returnType: node.type?.getText(sourceFile),
          lineNumber: sourceFile.getLineAndCharacterOfPosition(node.pos).line,
        });
      }

      if (ts.isClassDeclaration(node) && node.name) {
        const methods = node.members
          .filter(ts.isMethodDeclaration)
          .map((m) => m.name?.getText(sourceFile) || "")
          .filter(Boolean);

        classes.push({
          name: node.name.text,
          methods,
          lineNumber: sourceFile.getLineAndCharacterOfPosition(node.pos).line,
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { path: filePath, imports, exports, functions, classes };
  }

  private extractImport(
    node: ts.ImportDeclaration,
    currentFilePath: string
  ): ImportInfo {
    const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
    const isExternal =
      !moduleSpecifier.startsWith(".") && !moduleSpecifier.startsWith("/");

    let importedNames: string[] = [];

    if (node.importClause) {
      if (
        node.importClause.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        importedNames = node.importClause.namedBindings.elements.map(
          (el) => el.name.text
        );
      }

      if (node.importClause.name) {
        importedNames.push(node.importClause.name.text);
      }
    }

    let resolvedPath: string | undefined;
    if (!isExternal) {
      resolvedPath = this.resolveLocalImport(moduleSpecifier, currentFilePath);
    }

    return {
      moduleName: moduleSpecifier,
      resolvedPath,
      importedNames,
      isExternal,
    };
  }

  private resolveLocalImport(
    moduleName: string,
    fromFile: string
  ): string | undefined {
    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, moduleName);

    const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return undefined;
  }

  private hasExportModifier(node: ts.Node): boolean {
    // Type guard to check if node can have modifiers
    if (!ts.canHaveModifiers(node)) {
      return false;
    }

    const modifiers = ts.getModifiers(node);
    return !!modifiers?.some(
      (m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword
    );
  }

  private extractExport(node: ts.Node): ExportInfo | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return { name: node.name.text, type: "function" };
    }
    if (ts.isClassDeclaration(node) && node.name) {
      return { name: node.name.text, type: "class" };
    }
    if (ts.isVariableStatement(node)) {
      const declarations = node.declarationList.declarations;
      if (declarations.length > 0) {
        const declaration = declarations[0];
        if (ts.isIdentifier(declaration.name)) {
          return { name: declaration.name.text, type: "variable" };
        }
      }
    }
    return null;
  }
}
