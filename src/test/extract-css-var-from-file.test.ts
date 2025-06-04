import { extractCSSVariablesFromFile } from '../utils/extract-css-var-from-file';
import * as path from 'path';

describe('extractCSSVariablesFromFile', () => {
  it('should extract CSS variables from a file', () => {
    const filePath = path.resolve(__dirname, './mock.css');
    const result = extractCSSVariablesFromFile(filePath);

    expect(result).toEqual(
      expect.arrayContaining([
        { name: "--color-primary-opacity", value: "167, 79, 249" },
        { name: "--color-primary", value: "rgb(var(--color-primary-opacity))" }
      ])
    );
  });
});
