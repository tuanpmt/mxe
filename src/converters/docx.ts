import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  IParagraphOptions,
  Packer,
  Paragraph,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';
import * as fs from 'fs/promises';
import hljs from 'highlight.js'; // Change to default import
import { JSDOM } from 'jsdom';
import MarkdownIt from 'markdown-it';
import * as path from 'path';
import TurndownService from 'turndown';
import {
  createCodeBlock,
  createTable,
  createTableCell,
  getHeadingLevel,
  getImageDimensions,
} from '../utils/docx';
import { ConverterOptions } from './base';
import { HtmlConverter } from './html';

export class DocxConverter extends HtmlConverter {
  private md: MarkdownIt;
  private currentLevel: number = 0;
  private currentTableColumns: number = 0;
  private turndownService: TurndownService;

  constructor(options: ConverterOptions) {
    super(options);
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    }).enable(['table', 'link']);
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
  }

  private async processInlineToken(
    token: any
  ): Promise<(TextRun | ImageRun | ExternalHyperlink)[]> {
    const results: (TextRun | ImageRun | ExternalHyperlink)[] = [];

    if (!token.children) {
      return [new TextRun({ text: token.content || '' })];
    }

    for (const child of token.children) {
      switch (child.type) {
        case 'text':
          results.push(
            new TextRun({
              text: child.content,
              bold: token.markup === '**',
              italics: token.markup === '_',
              font: { name: 'Lato' },
            })
          );
          break;

        case 'image':
          try {
            const imageBuffer = await this.imageToBase64(child.attrs[0][1]);
            const dimensions = await getImageDimensions(imageBuffer);

            results.push(
              new ImageRun({
                data: Buffer.from(imageBuffer.split(',')[1], 'base64'),
                transformation: {
                  width: dimensions.width,
                  height: dimensions.height,
                },
              })
            );
          } catch (error) {
            console.warn(`Failed to process image: ${error}`);
          }
          break;

        case 'link':
          const linkText = child.children?.[0]?.content || child.content || '';
          const linkUrl =
            child.attrs?.find(
              ([key]: [string, string]) => key === 'href'
            )?.[1] || '';

          results.push(
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: linkText,
                  color: '0563C1',
                  underline: { type: 'single' },
                  style: 'Hyperlink',
                }),
              ],
              link: linkUrl,
            })
          );
          break;

        case 'code_inline':
          results.push(
            new TextRun({
              text: child.content,
              font: { name: 'Consolas' },
              size: 20,
            })
          );
          break;
      }
    }
    return results;
  }

  private createHeading(text: string, level: number): Paragraph {
    const options: IParagraphOptions = {
      text,
      heading: HeadingLevel[getHeadingLevel(level)],
      spacing: { before: 240, after: 120 },
      style: `Heading${level}`,
    };
    return new Paragraph(options);
  }

  private createParagraph(content: any[]): Paragraph {
    const options: IParagraphOptions = {
      children: content,
      spacing: { before: 120, after: 120 },
    };
    return new Paragraph(options);
  }

  private async processToken(token: any, tokens: any[]): Promise<Paragraph[]> {
    const elements: Paragraph[] = [];

    switch (token.type) {
      case 'heading_open':
        const level = parseInt(token.tag.slice(1));
        const headingText = tokens[tokens.indexOf(token) + 1].content;
        elements.push(this.createHeading(headingText, level));
        break;

      case 'paragraph_open':
        const contentToken = tokens[tokens.indexOf(token) + 1];
        if (contentToken.type === 'inline') {
          const inlineContent = await this.processInlineToken(contentToken);
          elements.push(this.createParagraph(inlineContent));
        }
        break;

      case 'code_block':
      case 'fence':
        elements.push(createCodeBlock(token.content, token.lang));
        break;

      case 'table_open':
        elements.push(this.processTable(tokens, tokens.indexOf(token)));
        break;
    }

    return elements;
  }

  private processTable(tokens: any[], startIndex: number): Paragraph {
    let index = startIndex;
    const rows: TableRow[] = [];
    let firstRow = true;
    index++;

    while (index < tokens.length && tokens[index].type !== 'table_close') {
      if (tokens[index].type === 'tr_open') {
        const cells = [];
        index++;

        while (index < tokens.length && tokens[index].type !== 'tr_close') {
          const cellType = tokens[index].type;
          if (cellType === 'th_open' || cellType === 'td_open') {
            const cellToken = tokens[index + 1];
            const cellContent =
              cellToken.content || cellToken.children?.[0]?.content || '';

            if (firstRow) {
              this.currentTableColumns = cells.length || 1;
            }

            cells.push(
              createTableCell(cellContent, firstRow, this.currentTableColumns)
            );
            index += 3;
          } else {
            index++;
          }
        }

        if (cells.length > 0) {
          rows.push(new TableRow({ children: cells }));
        }
        firstRow = false;
      }
      index++;
    }

    return new Paragraph({
      children: [createTable(rows)],
      spacing: { before: 240, after: 240 },
    });
  }

  protected async htmlToDocxElements(html: string): Promise<Paragraph[]> {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const elements: Paragraph[] = [];

    const processNode = async (node: Element): Promise<Paragraph[]> => {
      const paragraphs: Paragraph[] = [];

      switch (node.tagName.toLowerCase()) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          const level = parseInt(node.tagName[1]);
          paragraphs.push(
            new Paragraph({
              text: node.textContent || '',
              heading: HeadingLevel[getHeadingLevel(level)],
              spacing: { before: 240, after: 120 },
            })
          );
          break;

        case 'p':
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: node.textContent || '' })],
              spacing: { before: 120, after: 120 },
            })
          );
          break;

        case 'a':
          paragraphs.push(
            new Paragraph({
              children: [
                new ExternalHyperlink({
                  children: [
                    new TextRun({
                      text: node.textContent || '',
                      style: 'Hyperlink',
                    }),
                  ],
                  link: node.getAttribute('href') || '',
                }),
              ],
            })
          );
          break;

        case 'img':
          try {
            const src = node.getAttribute('src') || '';
            let imageData: string;

            if (src.startsWith('data:image')) {
              imageData = src;
            } else {
              imageData = await this.imageToBase64(src);
            }

            const dimensions = await getImageDimensions(imageData);

            paragraphs.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: Buffer.from(imageData.split(',')[1], 'base64'),
                    transformation: {
                      width: dimensions.width,
                      height: dimensions.height,
                    },
                  }),
                ],
                spacing: { before: 120, after: 120 },
              })
            );
          } catch (error) {
            console.warn(`Failed to process image: ${error}`);
          }
          break;

        case 'table':
          const rows: TableRow[] = [];
          const tableRows = node.querySelectorAll('tr');
          let firstRow = true;

          tableRows.forEach(tr => {
            const cells: TableCell[] = [];
            const cellEls = tr.querySelectorAll('th, td');

            if (firstRow) {
              this.currentTableColumns = cellEls.length || 1;
            }

            cellEls.forEach(cell => {
              cells.push(
                createTableCell(
                  cell.textContent || '',
                  firstRow,
                  this.currentTableColumns
                )
              );
            });

            if (cells.length > 0) {
              rows.push(new TableRow({ children: cells }));
            }
            firstRow = false;
          });

          if (rows.length > 0) {
            paragraphs.push(
              new Paragraph({
                children: [createTable(rows)],
                spacing: { before: 240, after: 240 },
              })
            );
          }
          break;

        case 'pre':
          const codeEl = node.querySelector('code');
          if (codeEl) {
            const lang = Array.from(codeEl.classList)
              .find(c => c.startsWith('language-'))
              ?.replace('language-', '');

            const code = codeEl.textContent || '';
            let highlighted: string;

            try {
              highlighted =
                lang && hljs.getLanguage(lang)
                  ? hljs.highlight(code, { language: lang }).value
                  : hljs.highlightAuto(code).value;
            } catch {
              highlighted = code;
            }

            const runs: TextRun[] = [];
            const lines = highlighted.split('\n');

            lines.forEach((line, index) => {
              if (index > 0) {
                runs.push(new TextRun({ break: 1 }));
              }

              const spans = line.split(/(<\/?span.*?>)/);
              let currentStyle: { color?: string } = {};

              spans.forEach(span => {
                if (span.startsWith('<span class="hljs-')) {
                  const colorMatch = span.match(/class="hljs-([^"]+)"/);
                  if (colorMatch) {
                    // Extended color mappings
                    const colors: Record<string, string> = {
                      keyword: 'd73a49',
                      string: '032f62',
                      number: '005cc5',
                      function: '6f42c1',
                      comment: '6a737d',
                      title: '6f42c1',
                      type: '005cc5',
                      literal: '005cc5',
                      built_in: '6f42c1',
                      params: '24292e',
                      property: '005cc5',
                      attr: '22863a',
                      class: '6f42c1',
                      variable: 'e36209',
                      operator: 'd73a49',
                      punctuation: '24292e',
                      plain: '24292e',
                    };
                    currentStyle.color = colors[colorMatch[1]] || '24292e'; // Default color if not found
                  }
                } else if (span === '</span>') {
                  currentStyle = { color: '24292e' }; // Default color for non-highlighted code
                } else if (span) {
                  runs.push(
                    new TextRun({
                      text: span,
                      font: { name: 'Consolas' },
                      size: 20,
                      color: currentStyle.color || '24292e',
                    })
                  );
                }
              });
            });

            paragraphs.push(
              new Paragraph({
                children: runs,
                spacing: { before: 240, after: 240 },
                style: 'CodeBlock',
                shading: {
                  type: 'solid',
                  fill: 'F6F8FA',
                },
              })
            );
          }
          break;

        // Add more element handlers as needed
      }

      // Process child nodes
      for (const child of Array.from(node.children) as Element[]) {
        paragraphs.push(...(await processNode(child)));
      }

      return paragraphs;
    };

    for (const node of Array.from(document.body.children) as Element[]) {
      elements.push(...(await processNode(node)));
    }

    return elements;
  }

  async convert(input: string): Promise<void> {
    const output = this.options.output
      ? path.join(this.options.output, path.basename(input, '.md') + '.docx')
      : input.replace(/\.md$/, '.docx');

    // First convert to HTML using parent class
    const markdown = await fs.readFile(input, 'utf-8');
    const html = await this.generateHtml(markdown);

    // Convert HTML to DOCX elements
    const elements = await this.htmlToDocxElements(html);

    // Create DOCX document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: elements,
        },
      ],
    });

    // Write DOCX file
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(output, buffer);

    console.log(`DOCX created: ${output}`);
  }
}
