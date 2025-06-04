import * as fs from "fs";
import { CSSVariable } from "../models/css-variable.model";

export const extractCSSVariablesFromFile = (filePath: string): CSSVariable[] => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const regex = /(--[\w-]+)\s*:\s*([^;]+);\s*(?:\/\*\s*(#[0-9a-fA-F]{3,6})\s*\*\/)?/g;

    const matches: CSSVariable[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const [, name, value] = match;
      const valueTrimmed = value.trim();

      matches.push({
        name,
        value: valueTrimmed,
      });
    }

    return matches;
  } catch (e) {
    console.error(`Failed to read ${filePath}`, e);
    return [];
  }
};