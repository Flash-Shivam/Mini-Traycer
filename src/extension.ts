import * as vscode from "vscode";
import { FileScanner } from "./analyzer/fileScanner";
import { DependencyGraphBuilder } from "./analyzer/dependencyGraph";
import { ContextExtractor } from "./analyzer/contextExtractor";
import { TaskBreakdown } from "./planner/taskBreakdown";
import { PlanGenerator } from "./planner/planGenerator";
import {
  OpenAIClient,
  MockLLMClient,
  LLMClient,
  ClaudeClient,
} from "./planner/llmClient";
import { PlanViewController } from "./ui/planViewController";

export function activate(context: vscode.ExtensionContext) {
  console.log("MiniTraycer is now active");

  // Register commands
  const createPlanCommand = vscode.commands.registerCommand(
    "miniTraycer.createPlan",
    async () => {
      await createPlan(context);
    }
  );

  const analyzeDepsCommand = vscode.commands.registerCommand(
    "miniTraycer.analyzeDependencies",
    async () => {
      await analyzeDependencies();
    }
  );

  context.subscriptions.push(createPlanCommand, analyzeDepsCommand);
}

async function createPlan(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const task = await vscode.window.showInputBox({
    prompt: "What would you like to implement?",
    placeHolder:
      "e.g., Add authentication middleware to protect /api/users routes",
  });

  if (!task) return;

  const progress = vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Generating plan...",
      cancellable: false,
    },
    async (progress) => {
      try {
        // Step 1: Scan files
        progress.report({ message: "Scanning files..." });
        const scanner = new FileScanner(workspaceFolder.uri.fsPath);
        const files = await scanner.discoverFiles();
        console.log(files);
        vscode.window.showInformationMessage(`Found ${files.length} files`);

        // Step 2: Build dependency graph
        progress.report({ message: "Building dependency graph..." });
        const graphBuilder = new DependencyGraphBuilder(
          workspaceFolder.uri.fsPath
        );
        const graph = await graphBuilder.build(files);
        vscode.window.showInformationMessage(
          `Graph: ${graph.nodes.size} nodes, ${graph.edges.size} edges`
        );

        // Step 3: Extract context
        progress.report({ message: "Extracting relevant context..." });
        const extractor = new ContextExtractor(graph, graphBuilder);
        const relevantContext = await extractor.extractForTask(task);

        // Step 4: Get LLM client
        const config = vscode.workspace.getConfiguration("miniTraycer");
        const provider = config.get<string>("llmProvider") || "openai";
        const apiKey = config.get<string>("apiKey");

        let llmClient: LLMClient;
        if (provider === "anthropic") {
          llmClient = new ClaudeClient(apiKey!);
        } else {
          llmClient = new OpenAIClient(apiKey!);
        }

        // Step 5: Break into phases
        progress.report({ message: "Breaking down task..." });
        const taskBreakdown = new TaskBreakdown(llmClient);
        const phases = await taskBreakdown.breakIntoPhases(
          task,
          relevantContext
        );

        // Step 6: Generate plan
        progress.report({ message: "Generating implementation plan..." });
        const planGenerator = new PlanGenerator(llmClient);
        const plan = await planGenerator.generatePlan(
          phases,
          relevantContext,
          task
        );

        // Step 7: Show plan UI
        const planView = new PlanViewController(context);
        planView.show(plan);
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
        console.error(error);
      }
    }
  );
}

async function analyzeDependencies() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const scanner = new FileScanner(workspaceFolder.uri.fsPath);
  const files = await scanner.discoverFiles();

  const graphBuilder = new DependencyGraphBuilder(workspaceFolder.uri.fsPath);
  const graph = await graphBuilder.build(files);

  const output = `Dependency Analysis:
- Total Files: ${graph.nodes.size}
- Dependencies: ${graph.edges.size}
- Root Files (entry points): ${graph.roots.size}
- Leaf Files (no dependencies): ${graph.leaves.size}

Top 10 Files by Connections:
${Array.from(graph.nodes.values())
  .sort(
    (a, b) =>
      b.dependedBy.size +
      b.dependsOn.size -
      (a.dependedBy.size + a.dependsOn.size)
  )
  .slice(0, 10)
  .map(
    (n) =>
      `- ${n.relativePath}: ${n.dependedBy.size} dependents, ${n.dependsOn.size} dependencies`
  )
  .join("\n")}`;

  const doc = await vscode.workspace.openTextDocument({
    content: output,
    language: "markdown",
  });
  await vscode.window.showTextDocument(doc);
}

export function deactivate() {}
