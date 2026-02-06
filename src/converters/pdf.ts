import * as fs from 'fs/promises';
import path from 'path';
import puppeteer, { PDFOptions } from 'puppeteer';
import { Heading } from './base';
import { HtmlConverter } from './html';

interface PDFOutlineItem {
  title: string;
  page: number;
  children?: PDFOutlineItem[];
}

export class PDFConverter extends HtmlConverter {
  async convert(input: string): Promise<void> {
    const inputDir = path.dirname(path.resolve(input));
    const output = this.options.output
      ? path.join(this.options.output, path.basename(input, '.md') + '.pdf')
      : input.replace(/\.md$/, '.pdf');

    process.chdir(inputDir);

    const markdown = await fs.readFile(input, 'utf-8');
    const html = await this.generateHtml(markdown);
    const headings = this.getHeadings();

    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    // Wait for any mermaid diagrams to render
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        // Wait a bit for mermaid to initialize
        setTimeout(resolve, 1000);
      });
    });

    const pdfOptions: PDFOptions = {
      path: output,
      format: 'A4',
      margin: {
        top: '1.5cm',
        bottom: '2cm',
        left: '1.5cm',
        right: '1.5cm',
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; padding: 5px 20px; font-size: 9px; display: flex; justify-content: space-between; color: #666;">
          <span></span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      `,
      preferCSSPageSize: false,
    };

    // Generate PDF with outline/bookmarks if enabled
    if (this.options.bookmarks && headings.length > 0) {
      // Puppeteer doesn't natively support PDF outlines/bookmarks
      // We need to add them via page evaluation or post-processing
      // For now, we add internal links that work in PDF
      
      // Add bookmark script to collect heading positions
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
          /* Ensure headings have proper anchors */
          h1[id], h2[id], h3[id], h4[id], h5[id], h6[id] {
            scroll-margin-top: 20px;
          }
          
          /* PDF-specific adjustments */
          @media print {
            .table-of-contents {
              page-break-after: always;
            }
            
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
            }
            
            pre, .code-block, .mermaid-diagram {
              page-break-inside: avoid;
            }
          }
        `;
        document.head.appendChild(style);
      });
    }

    await page.pdf(pdfOptions);

    // Post-process PDF to add bookmarks using pdf-lib if available
    if (this.options.bookmarks && headings.length > 0) {
      await this.addPdfBookmarks(output, headings);
    }

    await browser.close();
    console.log(`PDF created: ${output}`);
    
    if (headings.length > 0) {
      console.log(`  📑 ${headings.length} heading(s) indexed`);
    }
  }

  /**
   * Add bookmarks/outlines to PDF using pdf-lib
   */
  private async addPdfBookmarks(pdfPath: string, headings: Heading[]): Promise<void> {
    try {
      // Dynamic import pdf-lib
      const { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFNumber, PDFHexString } = await import('pdf-lib');
      
      const pdfBytes = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      if (pages.length === 0) return;

      // Create outline dictionary
      const context = pdfDoc.context;
      const outlineRef = context.nextRef();
      
      // Build outline items from headings
      // Note: This is a simplified implementation - page detection would need
      // to be done during rendering for accurate page numbers
      const outlineItems: Array<{ 
        ref: any; 
        title: string; 
        level: number;
        parent?: any;
      }> = [];
      
      for (const heading of headings) {
        const itemRef = context.nextRef();
        outlineItems.push({
          ref: itemRef,
          title: heading.text,
          level: heading.level,
        });
      }

      if (outlineItems.length === 0) return;

      // Create outline dictionary entries
      const outlineDict = context.obj({
        Type: PDFName.of('Outlines'),
        First: outlineItems[0].ref,
        Last: outlineItems[outlineItems.length - 1].ref,
        Count: PDFNumber.of(outlineItems.length),
      });

      // Create each outline item
      for (let i = 0; i < outlineItems.length; i++) {
        const item = outlineItems[i];
        const prev = i > 0 ? outlineItems[i - 1].ref : null;
        const next = i < outlineItems.length - 1 ? outlineItems[i + 1].ref : null;
        
        // Destination - first page for now (accurate page detection needs rendering info)
        const destPage = pages[0];
        const destArray = context.obj([
          destPage.ref,
          PDFName.of('XYZ'),
          PDFNumber.of(0),
          PDFNumber.of(destPage.getHeight()),
          PDFNumber.of(0),
        ]);

        const itemDict: Record<string, any> = {
          Title: PDFHexString.fromText(item.title),
          Parent: outlineRef,
          Dest: destArray,
        };

        if (prev) itemDict.Prev = prev;
        if (next) itemDict.Next = next;

        context.assign(item.ref, context.obj(itemDict));
      }

      context.assign(outlineRef, outlineDict);

      // Set document outlines
      pdfDoc.catalog.set(PDFName.of('Outlines'), outlineRef);

      // Save modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      await fs.writeFile(pdfPath, modifiedPdfBytes);
      
      console.log(`  🔖 Added ${outlineItems.length} bookmark(s)`);
    } catch (error) {
      // pdf-lib might not be installed, that's OK
      console.warn(`  ⚠️  Could not add bookmarks: ${error}`);
    }
  }

  protected getFontPath(fontName: string): string {
    return path.resolve(__dirname, '..', 'fonts', 'lato', fontName);
  }
}
