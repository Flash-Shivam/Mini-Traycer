import * as vscode from "vscode";
import { ImplementationPlan } from "../types";

export class PlanViewController {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private context: vscode.ExtensionContext) {}

  show(plan: ImplementationPlan) {
    if (this.panel) {
      this.panel.reveal();
    } else {
      this.panel = vscode.window.createWebviewPanel(
        "miniTracerPlan",
        "Implementation Plan",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    this.panel.webview.html = this.getHtmlContent(plan);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "copy":
            vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage("Plan copied to clipboard!");
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  private getHtmlContent(plan: ImplementationPlan): string {
    const formattedPlan = this.formatPlanAsText(plan);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Implementation Plan</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1, h2, h3 { margin-top: 24px; }
        .phase {
            border: 1px solid var(--vscode-panel-border);
            padding: 16px;
            margin: 16px 0;
            border-radius: 4px;
            background: var(--vscode-editor-background);
        }
        .file-plan {
            margin: 12px 0;
            padding: 12px;
            border-left: 3px solid var(--vscode-textLink-foreground);
            background: var(--vscode-editor-inactiveSelectionBackground);
        }
        .change {
            margin: 8px 0;
            padding: 8px;
            background: var(--vscode-editor-selectionBackground);
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            margin: 8px 4px 8px 0;
            border-radius: 2px;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <h1>Implementation Plan</h1>
    
    <div>
        <button onclick="copyPlan()">Copy Plan</button>
        <button onclick="exportMarkdown()">Export as Markdown</button>
    </div>

    <h2>Phases (${plan.phases.length})</h2>
    ${plan.phases
      .map(
        (phase, i) => `
        <div class="phase">
            <h3>Phase ${i + 1}: ${phase.title}</h3>
            <p>${phase.description}</p>
            ${
              phase.dependencies.length > 0
                ? `<p><em>Depends on: ${phase.dependencies.join(", ")}</em></p>`
                : ""
            }
        </div>
    `
      )
      .join("")}

    <h2>File Changes (${plan.filePlans.length})</h2>
    ${plan.filePlans
      .map(
        (fp) => `
        <div class="file-plan">
            <h3><code>${fp.filePath}</code> - ${fp.action}</h3>
            <p><strong>Reasoning:</strong> ${fp.reasoning}</p>
            <h4>Changes:</h4>
            ${fp.changes
              .map(
                (change) => `
                <div class="change">
                    <strong>${change.type}</strong> at <code>${
                  change.location
                }</code>
                    <p>${change.description}</p>
                    <pre><code>${this.escapeHtml(change.code)}</code></pre>
                </div>
            `
              )
              .join("")}
        </div>
    `
      )
      .join("")}

    <h2>Complexity: ${plan.estimatedComplexity.toUpperCase()}</h2>

    <script>
        const vscode = acquireVsCodeApi();
        
        function copyPlan() {
            const planText = ${JSON.stringify(formattedPlan)};
            vscode.postMessage({
                command: 'copy',
                text: planText
            });
        }

        function exportMarkdown() {
            const planText = ${JSON.stringify(formattedPlan)};
            vscode.postMessage({
                command: 'export',
                text: planText
            });
        }
    </script>
</body>
</html>`;
  }

  private formatPlanAsText(plan: ImplementationPlan): string {
    let text = "# Implementation Plan\n\n";

    text += "## Phases\n\n";
    plan.phases.forEach((phase, i) => {
      text += `### Phase ${i + 1}: ${phase.title}\n`;
      text += `${phase.description}\n\n`;
    });

    text += "## File Changes\n\n";
    plan.filePlans.forEach((fp) => {
      text += `### ${fp.filePath} (${fp.action})\n`;
      text += `**Reasoning:** ${fp.reasoning}\n\n`;
      text += "**Changes:**\n";
      fp.changes.forEach((change) => {
        text += `- ${change.type} at ${change.location}: ${change.description}\n`;
        text += `\`\`\`\n${change.code}\n\`\`\`\n\n`;
      });
    });

    return text;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
