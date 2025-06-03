import * as vscode from "vscode";
import * as fs from "fs";

interface CSSVariable {
  name: string;
  value: string;
  hex?: string;
}

function rgbToHex(rgb: string): string | undefined {
  const rgbMatch = rgb.match(/^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/);
  if (!rgbMatch) return;

  const [r, g, b] = rgbMatch.slice(1).map(Number);
  if ([r, g, b].some(n => n < 0 || n > 255)) return;

  return (
    "#" +
    [r, g, b]
      .map(n => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function extractCSSVariablesFromFile(filePath: string): CSSVariable[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const regex = /(--[\w-]+)\s*:\s*([^;]+);\s*(?:\/\*\s*(#[0-9a-fA-F]{3,6})\s*\*\/)?/g;

    const matches: CSSVariable[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const [, name, value, hexComment] = match;
      const valueTrimmed = value.trim();
      const fallbackHex = !hexComment ? rgbToHex(valueTrimmed) : undefined;

      matches.push({
        name,
        value: valueTrimmed,
        hex: hexComment || fallbackHex,
      });
    }

    return matches;
  } catch (e) {
    console.error(`Failed to read ${filePath}`, e);
    return [];
  }
}

async function findAllCSSVariables(): Promise<CSSVariable[]> {
  const variables: Map<string, CSSVariable> = new Map();
  const cssFiles = await vscode.workspace.findFiles("**/*.css", "**/node_modules/**", 100);

  for (const file of cssFiles) {
    const absPath = file.fsPath;
    const vars = extractCSSVariablesFromFile(absPath);
    vars.forEach(v => variables.set(v.name, v));
  }

  return Array.from(variables.values());
}

function updateColorDecorations(editor: vscode.TextEditor, variables: CSSVariable[]) {
  const text = editor.document.getText();
  const decorations: vscode.DecorationOptions[] = [];

  const regex = /var\((--[\w-]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const varName = match[1];
    const variable = variables.find(v => v.name === varName);
    if (!variable?.hex) continue;

    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.positionAt(match.index + match[0].length);

    decorations.push({
      range: new vscode.Range(startPos, endPos),
      renderOptions: {
        before: {
          contentText: ' ',
          backgroundColor: variable.hex,
          margin: '0 0 0 4px',
          width: '12px',
          height: '12px',
          border: '1px solid #ccc',
        },
      },
    });
  }

  editor.setDecorations(colorDecorationType, decorations);
}

// MAIN ========================================================================================

let cachedVariables: CSSVariable[] = [];
let colorDecorationType: vscode.TextEditorDecorationType;

export async function activate(context: vscode.ExtensionContext) {
  console.log("🔥 CSS Variables Extension Activated");

  cachedVariables = await findAllCSSVariables();
  console.log("🎨 Loaded CSS Variables:", cachedVariables);

  colorDecorationType = vscode.window.createTextEditorDecorationType({});

  const provider = vscode.languages.registerCompletionItemProvider(
    "typescriptreact",
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position);
        const text = line.text.substring(0, position.character);

        const insideVarCall = /var\(--[\w-]*$/.test(text);
        if (!insideVarCall) return;

        return cachedVariables.map(({ name, value, hex }) => {
          const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable);
          item.insertText = name;
          item.detail = value;

          if (hex) {
            item.kind = vscode.CompletionItemKind.Color;
            item.documentation = new vscode.MarkdownString(
              `![color](https://via.placeholder.com/10/${hex.replace("#", "")}/000000?text=+) \`${hex}\`\n\`${value}\``
            );
          }

          return item;
        });
      },
    },
    "-", "("
  );

  context.subscriptions.push(provider);

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    updateColorDecorations(activeEditor, cachedVariables);
  }

  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      updateColorDecorations(editor, cachedVariables);
    }
  }, null, context.subscriptions);

  vscode.workspace.onDidChangeTextDocument(event => {
    const editor = vscode.window.activeTextEditor;
    if (editor && event.document === editor.document) {
      updateColorDecorations(editor, cachedVariables);
    }
  }, null, context.subscriptions);
}

export function deactivate() {}
