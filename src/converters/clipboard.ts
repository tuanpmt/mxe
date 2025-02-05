import clipboard from 'clipboardy';
import * as fs from 'fs/promises';
import { BaseConverter } from './base';
import { HtmlConverter } from './html';

export class ClipboardConverter extends BaseConverter {
  async convert(input: string): Promise<void> {
    // Read markdown content from file
    const markdown = await fs.readFile(input, 'utf-8');

    const htmlConverter = new HtmlConverter(this.options);
    const html = await htmlConverter.convertToString(markdown);

    await clipboard.write(html);
    console.log('Content copied to clipboard in HTML format');
  }
}
