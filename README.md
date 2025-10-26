
# MiniTraycer

A simplified implementation of Traycer's planning layer for AI coding agents.

## Features

- **Codebase Analysis**: Scans and parses TypeScript, JavaScript, and Go files

- **Dependency Graph**: Builds relationships between files

- **Context Extraction**: Finds relevant files for tasks

- **AI Planning**: Generates structured implementation plans

- **Visual Plan Editor**: Review and edit plans before handoff

- **Agent Integration**: Format plans for Cursor, Claude, etc.


## Project Structure
```

mini-traycer/

├── src/

│ ├── analyzer/

│ │ ├── fileScanner.ts

│ │ ├── fileParser.ts

│ │ ├── goParser.ts

│ │ ├── dependencyGraph.ts

│ │ └── contextExtractor.ts

│ ├── planner/

│ │ ├── llmClient.ts

│ │ ├── taskBreakdown.ts

│ │ └── planGenerator.ts

│ ├── ui/

│ │ ├── webview/

│ │ │ ├── index.html

│ │ │ ├── app.tsx

│ │ │ └── PlanView.tsx

│ │ └── planViewController.ts

│ ├── handoff/

│ │ └── promptFormatter.ts

│ ├── verifier/

│ │ ├── diffAnalyzer.ts

│ │ └── planValidator.ts

│ ├── extension.ts

│ └── types.ts

├── test/

│ ├── analyzer.test.ts

│ ├── planner.test.ts

│ └── integration.test.ts

├── package.json

├── tsconfig.json

├── .eslintrc.json

├── README.md

├── .gitignore

└── .vscodeignore

````



## Setup



1. **Install Dependencies**

```bash

npm install

````

2. **Configure API Key**

- Open VS Code Settings

- Search for "MiniTraycer"

- Enter your OpenAI API key (or use mock mode)

3. **Compile**

```bash

npm run compile

```

4. **Run Extension**

- Press `F5` in VS Code

- This opens Extension Development Host

## Usage

1. Open Command Palette (`Cmd+Shift+P`)

2. Run "MiniTraycer: Create Implementation Plan"

3. Enter your task (e.g., "Add authentication middleware")

4. Review the generated plan

5. Copy to clipboard or export
