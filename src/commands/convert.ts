import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseConverter, ConverterOptions, MermaidTheme, MermaidLayout, FontFamily } from '../converters/base';
import { ClipboardConverter } from '../converters/clipboard';
import { DocxConverter } from '../converters/docx';
import { HtmlConverter } from '../converters/html';
import { PDFConverter } from '../converters/pdf';
import { isURL } from '../utils/url';
import { download } from './download';

interface ConvertOptions {
  format?: 'pdf' | 'docx' | 'html' | 'clipboard';
  style?: string;
  output?: string;
  
  // TOC
  toc?: boolean;
  tocDepth?: number;
  
  // Bookmarks
  bookmarks?: boolean;
  
  // Mermaid
  mermaidTheme?: MermaidTheme;
  mermaidLayout?: MermaidLayout;
  handDraw?: boolean;
  
  // Syntax highlighting
  highlightTheme?: string;
  
  // Fonts
  font?: FontFamily;
  monoFont?: FontFamily;
}

export const convert = async (input: string, options: ConvertOptions) => {
  try {
    let content: string;
    let workingDir = process.cwd();
    let inputFilename = '';

    if (isURL(input)) {
      const result = await download(input, { output: options.output });
      content = result.content;
      workingDir = result.workingDir;
      inputFilename = result.inputFilename;
    } else {
      content = await fs.readFile(input, 'utf-8');
      workingDir = path.dirname(path.resolve(input));
      inputFilename = path.basename(input);
    }

    // Change working directory
    process.chdir(workingDir);

    // Build converter options
    const converterOptions: ConverterOptions = {
      style: options.style,
      output: options.output,
      toc: options.toc,
      tocDepth: options.tocDepth,
      bookmarks: options.bookmarks !== false, // Default true
      mermaid: {
        theme: options.mermaidTheme || 'default',
        layout: options.mermaidLayout || 'elk',  // ELK is the new default
        handDraw: options.handDraw || false,
      },
      highlightTheme: options.highlightTheme,
      font: options.font,
      monoFont: options.monoFont,
    };

    let converter: BaseConverter;

    switch (options.format) {
      case 'docx':
        converter = new DocxConverter(converterOptions);
        break;
      case 'html':
        converter = new HtmlConverter(converterOptions);
        break;
      case 'clipboard':
        converter = new ClipboardConverter(converterOptions);
        break;
      default:
        converter = new PDFConverter(converterOptions);
    }

    await converter.convert(inputFilename);
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  }
};
