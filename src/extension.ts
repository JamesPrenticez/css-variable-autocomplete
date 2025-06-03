import * as vscode from "vscode";
import * as fs from 'fs';

function extractCSSVariablesFromFile(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const regex = /--[\w-]+(?=:)/g;
    const matches = content.match(regex);
    return matches || [];
  } catch (e) {
    console.error(`Failed to read ${filePath}`, e);
    return [];
  }
}

async function findAllCSSVariables(): Promise<string[]> {
  const variables: Set<string> = new Set();
  const cssFiles = await vscode.workspace.findFiles('**/*.css', '**/node_modules/**', 100);

  for (const file of cssFiles) {
    const absPath = file.fsPath;
    const vars = extractCSSVariablesFromFile(absPath);
    vars.forEach(v => variables.add(v));
  }

  return Array.from(variables);
}

// MAIN=======================
let cachedVariables: string[] = [];

export async function activate(context: vscode.ExtensionContext) {
  console.log("🔥 CSS Variables Extension Activated");

  cachedVariables = await findAllCSSVariables();
  console.log("📦 Loaded CSS Variables:", cachedVariables);

  const provider = vscode.languages.registerCompletionItemProvider(
    'typescriptreact',
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position);
        const text = line.text.substring(0, position.character);

        const varPrefixMatch = /--[\w-]*$/.exec(text);
        if (!varPrefixMatch) return;

        const startChar = position.character - varPrefixMatch[0].length;
        const range = new vscode.Range(
          position.line,
          startChar,
          position.line,
          position.character
        );

        return cachedVariables.map(variable => {
          const item = new vscode.CompletionItem(variable, vscode.CompletionItemKind.Variable);
          item.insertText = variable; // only insert --color-primary
          item.detail = 'CSS Variable';
          item.range = range; // replace just the --xyz being typed
          return item;
        });
      }
    },
    '-', '('
  );

  context.subscriptions.push(provider);
}

export function deactivate() {}
