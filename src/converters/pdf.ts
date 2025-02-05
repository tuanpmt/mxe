import * as fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { HtmlConverter } from './html';

export class PDFConverter extends HtmlConverter {
  async convert(input: string): Promise<void> {
    const inputDir = path.dirname(path.resolve(input));
    const output = this.options.output
      ? path.join(this.options.output, path.basename(input, '.md') + '.pdf')
      : input.replace(/\.md$/, '.pdf');

    process.chdir(inputDir);

    const markdown = await fs.readFile(input, 'utf-8');
    const html = await this.generateHtml(markdown);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.pdf({
      path: output,
      format: 'A4',
      margin: {
        top: '1.5cm',
        bottom: '1.5cm',
        left: '1.5cm',
        right: '1.5cm',
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; padding: 5px; font-size: 8px; text-align: center; color: #666;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
      preferCSSPageSize: false,
    });

    await browser.close();
    console.log(`PDF created: ${output}`);
  }

  protected getFontPath(fontName: string): string {
    return path.resolve(__dirname, '..', 'fonts', 'lato', fontName);
  }
}
