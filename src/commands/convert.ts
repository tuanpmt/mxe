import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseConverter } from '../converters/base';
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

    let converter: BaseConverter;

    switch (options.format) {
      case 'docx':
        converter = new DocxConverter(options);
        break;
      case 'html':
        converter = new HtmlConverter(options);
        break;
      case 'clipboard':
        converter = new ClipboardConverter(options);
        break;
      default:
        converter = new PDFConverter(options);
    }

    await converter.convert(inputFilename);
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  }
};
