import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import hljs from 'highlight.js';
import { marked } from 'marked';
import path from 'path';
import { extractHeadings, generateTocHtml, getTocStyles, addHeadingIds } from '../utils/toc';
import { getSimpleGoogleFontsUrl, getFontFamily } from '../utils/fonts';
import { processDiagrams, RenderOptions } from '../utils/diagram-renderer';
import { BaseConverter, ConverterOptions, Heading } from './base';

interface Image {
  href: string;
  title: string | null;
  text: string;
  type?: string;
  raw?: string;
  tokens?: unknown[];
}

export class HtmlConverter extends BaseConverter {
  protected renderer: typeof marked.Renderer.prototype;
  protected headings: Heading[] = [];

  protected async imageToBase64(imagePath: string): Promise<string> {
    try {
      const fullPath = path.resolve(process.cwd(), imagePath);
      const imageBuffer = await fs.readFile(fullPath);
      const ext = path.extname(imagePath).slice(1).toLowerCase();
      const mimeType = ext === 'svg' ? 'svg+xml' : ext;
      return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      console.warn(`Warning: Could not load image ${imagePath}:`, error);
      return '';
    }
  }

  private async getFontBase64(fontName: string): Promise<string> {
    try {
      const fontPath = path.resolve(__dirname, '..', 'fonts', 'lato', fontName);
      const fontBuffer = await fs.readFile(fontPath);
      return fontBuffer.toString('base64');
    } catch (error) {
      console.warn(`Warning: Could not load font ${fontName}: ${error}`);
      return '';
    }
  }

  constructor(options: ConverterOptions) {
    super(options);
    this.renderer = new marked.Renderer();

    const originalImage = this.renderer.image.bind(this.renderer);

    // Image renderer - convert local images to base64
    this.renderer.image = (options: Image): string => {
      let { href, title, text } = options;

      if (!href.startsWith('http') && !href.startsWith('data:')) {
        try {
          const fullPath = path.resolve(process.cwd(), href);
          const imageBuffer = fsSync.readFileSync(fullPath);
          const ext = path.extname(href).slice(1).toLowerCase();
          const mimeType = ext === 'svg' ? 'svg+xml' : ext;
          href = `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
        } catch (error) {
          console.warn(`Warning: Could not load image ${href}:`, error);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalImage({
        ...options,
        href,
        type: 'image',
        raw: `![${text}](${href}${title ? ` "${title}"` : ''})`,
      } as any);
    };

    // Code highlighting with better styling
    this.renderer.code = ({ text, lang }): string => {
      // Mermaid and WaveDrom are pre-processed and replaced before this runs
      // So we don't need special handling here

      const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, {
        language: validLanguage,
      }).value;

      return `
        <div class="code-block">
          ${lang ? `<div class="code-lang">${lang}</div>` : ''}
          <pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>
        </div>
      `;
    };

    marked.setOptions({
      renderer: this.renderer,
      gfm: true,
      breaks: true,
      pedantic: false,
    });
  }

  async convertToString(input: string): Promise<string> {
    const html = await this.generateHtml(input);
    return html;
  }

  protected async generateHtml(markdown: string): Promise<string> {
    // Extract headings for TOC and bookmarks
    this.headings = extractHeadings(markdown, this.options.tocDepth || 3);

    // Process all diagrams (Mermaid, WaveDrom) - renders to inline SVG
    const renderOptions: RenderOptions = {
      mermaid: this.options.mermaid,
    };
    const processedMarkdown = await processDiagrams(markdown, renderOptions);

    // Parse markdown
    const tokens = marked.lexer(processedMarkdown);
    const processedTokens = [];

    for (const token of tokens) {
      if (token.type === 'paragraph') {
        token.text = await this.processImages(token.text);
      }
      processedTokens.push(token);
    }

    let html = marked.parser(processedTokens);

    // Add heading IDs for anchor links
    html = addHeadingIds(html, this.headings);

    // Generate TOC if enabled
    let tocHtml = '';
    if (this.options.toc) {
      tocHtml = generateTocHtml(this.headings);
    }

    return this.wrapHtml(html, tocHtml);
  }

  protected async processImages(text: string): Promise<string> {
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let result = text;
    const matches = text.matchAll(regex);

    for (const match of matches) {
      const [fullMatch, alt, href] = match;
      if (!href.startsWith('http') && !href.startsWith('data:')) {
        const base64Url = await this.imageToBase64(href);
        result = result.replace(fullMatch, `![${alt}](${base64Url})`);
      }
    }

    return result;
  }

  protected getHighlightStyles(): string {
    // GitHub-style syntax highlighting
    return `
      /* Code block container */
      .code-block {
        position: relative;
        margin: 1em 0;
      }

      .code-lang {
        position: absolute;
        top: 0;
        right: 0;
        padding: 2px 8px;
        font-size: 11px;
        color: #586069;
        background: #f1f3f5;
        border-radius: 0 6px 0 6px;
        font-family: -apple-system, system-ui, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      pre {
        background: #f6f8fa;
        border-radius: 6px;
        padding: 16px;
        overflow-x: auto;
        font-size: 13px;
        line-height: 1.5;
        font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
        border: 1px solid #e1e4e8;
      }

      code {
        font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
      }

      :not(pre) > code {
        font-size: 85%;
        padding: 0.2em 0.4em;
        background: rgba(27,31,35,0.05);
        border-radius: 3px;
        color: #e01e5a;
      }

      /* GitHub-style syntax colors */
      .hljs { color: #24292e; }
      .hljs-comment, .hljs-quote { color: #6a737d; font-style: italic; }
      .hljs-keyword, .hljs-selector-tag { color: #d73a49; font-weight: 600; }
      .hljs-string, .hljs-attr { color: #032f62; }
      .hljs-number, .hljs-literal { color: #005cc5; }
      .hljs-function, .hljs-title { color: #6f42c1; }
      .hljs-built_in, .hljs-type { color: #005cc5; }
      .hljs-variable, .hljs-template-variable { color: #e36209; }
      .hljs-attribute { color: #005cc5; }
      .hljs-tag { color: #22863a; }
      .hljs-name { color: #22863a; }
      .hljs-selector-class, .hljs-selector-id { color: #6f42c1; }
      .hljs-addition { color: #22863a; background: #f0fff4; }
      .hljs-deletion { color: #b31d28; background: #ffeef0; }
      .hljs-emphasis { font-style: italic; }
      .hljs-strong { font-weight: bold; }
    `;
  }

  protected getDiagramStyles(): string {
    return `
      /* Diagram styles (Mermaid, WaveDrom, etc.) */
      .diagram {
        display: flex;
        justify-content: center;
        margin: 1.5em 0;
        page-break-inside: avoid;
        overflow-x: auto;
      }

      .diagram svg {
        max-width: 100%;
        height: auto;
      }
    `;
  }

  protected wrapHtml(content: string, tocHtml: string = ''): string {
    // Diagrams are pre-rendered to inline SVG, no scripts needed
    
    // Get font settings
    const bodyFont = this.options.font || 'inter';
    const monoFont = this.options.monoFont || 'jetbrains-mono';
    const fontsToLoad = [bodyFont, monoFont].filter((f, i, arr) => arr.indexOf(f) === i);
    const googleFontsUrl = getSimpleGoogleFontsUrl(fontsToLoad);
    const bodyFontFamily = getFontFamily(bodyFont);
    const monoFontFamily = getFontFamily(monoFont);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="${googleFontsUrl}" rel="stylesheet">
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: ${bodyFontFamily};
              max-width: 95%;
              margin: 0 auto;
              padding: 0;
              line-height: 1.6;
              color: #24292e;
            }

            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 600;
              line-height: 1.25;
            }

            h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
            h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
            h3 { font-size: 1.25em; }
            h4 { font-size: 1em; }

            p { margin: 1em 0; }

            a { color: #0366d6; text-decoration: none; }
            a:hover { text-decoration: underline; }

            blockquote {
              margin: 1em 0;
              padding: 0.5em 1em;
              border-left: 4px solid #dfe2e5;
              color: #6a737d;
              background: #f6f8fa;
            }

            ul, ol { padding-left: 2em; margin: 1em 0; }
            li { margin: 0.25em 0; }

            img {
              display: block;
              max-width: 100%;
              width: auto;
              height: auto;
              margin: 1.5em auto;
              border-radius: 4px;
            }
            
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
              page-break-inside: avoid;
            }
            
            th, td {
              border: 1px solid #dfe2e5;
              padding: 8px 12px;
              text-align: left;
            }
            
            th {
              background-color: #f6f8fa;
              font-weight: 600;
            }

            tr:nth-child(even) {
              background-color: #f8f9fa;
            }

            hr {
              border: none;
              border-top: 1px solid #eaecef;
              margin: 2em 0;
            }

            /* Code blocks with custom mono font */
            pre, code {
              font-family: ${monoFontFamily};
            }

            /* Task lists */
            .task-list-item {
              list-style-type: none;
              margin-left: -1.5em;
            }

            .task-list-item input {
              margin-right: 0.5em;
            }

            ${this.getHighlightStyles()}
            ${this.getDiagramStyles()}
            ${this.options.toc ? getTocStyles() : ''}
            ${this.options.style ? fsSync.readFileSync(this.options.style, 'utf-8') : ''}
          </style>
        </head>
        <body>
          ${tocHtml}
          ${content}
        </body>
      </html>
    `;
  }

  async convert(input: string): Promise<void> {
    const inputDir = path.dirname(path.resolve(input));
    let output: string;
    if (this.options.output) {
      // If output ends with .html, use it directly; otherwise treat as directory
      if (this.options.output.endsWith('.html')) {
        output = path.resolve(this.options.output);
      } else {
        output = path.resolve(this.options.output, path.basename(input, '.md') + '.html');
      }
    } else {
      output = path.resolve(input.replace(/\.md$/, '.html'));
    }

    process.chdir(inputDir);

    const markdown = await fs.readFile(input, 'utf-8');
    const html = await this.generateHtml(markdown);

    await fs.writeFile(output, html);
    console.log(`HTML created: ${output}`);
  }

  getHeadings(): Heading[] {
    return this.headings;
  }
}
