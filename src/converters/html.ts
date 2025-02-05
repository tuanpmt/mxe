import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import hljs from 'highlight.js';
import { marked } from 'marked';
import path from 'path';
import { BaseConverter, ConverterOptions } from './base';

interface MarkedCode {
  text: string;
  lang?: string;
  escaped?: boolean;
}

interface MarkedImage {
  href: string;
  title: string | null;
  text: string;
}

interface Image {
  href: string;
  title: string | null;
  text: string;
  type?: string;
  raw?: string;
}

export class HtmlConverter extends BaseConverter {
  protected renderer: typeof marked.Renderer.prototype;

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
      // Use path.resolve to get absolute path from source directory
      const fontPath = path.resolve(__dirname, '..', 'fonts', 'lato', fontName);
      const fontBuffer = await fs.readFile(fontPath);
      return fontBuffer.toString('base64');
    } catch (error) {
      console.warn(`Warning: Could not load font ${fontName}: ${error}`);
      // Return empty string on error to allow fallback fonts
      return '';
    }
  }

  constructor(options: ConverterOptions) {
    super(options);
    this.renderer = new marked.Renderer();

    const originalImage = this.renderer.image.bind(this.renderer);

    // Fix image renderer signature to match marked's Image type
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
      return originalImage({
        ...options,
        href,
        type: 'image',
        raw: `![${text}](${href}${title ? ` "${title}"` : ''})`,
      });
    };

    // Configure code highlighting
    this.renderer.code = ({ text, lang }: MarkedCode): string => {
      const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, {
        language: validLanguage,
      }).value;
      return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
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
    const tokens = marked.lexer(markdown);
    const processedTokens = [];

    for (const token of tokens) {
      if (token.type === 'paragraph') {
        const text = token.text;
        token.text = await this.processImages(text);
      }
      processedTokens.push(token);
    }

    const html = marked.parser(processedTokens);
    return this.wrapHtml(html);
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

  protected wrapHtml(content: string): string {
    const latoRegular = this.getFontBase64('Lato-Regular.ttf');
    const latoBold = this.getFontBase64('Lato-Bold.ttf');
    const latoItalic = this.getFontBase64('Lato-Italic.ttf');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @font-face {
              font-family: 'Lato';
              src: url(data:font/ttf;base64,${latoRegular}) format('truetype');
              font-weight: normal;
              font-style: normal;
            }
            
            @font-face {
              font-family: 'Lato';
              src: url(data:font/ttf;base64,${latoBold}) format('truetype');
              font-weight: bold;
              font-style: normal;
            }
            
            @font-face {
              font-family: 'Lato';
              src: url(data:font/ttf;base64,${latoItalic}) format('truetype');
              font-weight: normal;
              font-style: italic;
            }

            body {
              font-family: 'Lato', -apple-system, system-ui, sans-serif;
              max-width: 95%;  /* Wider content area */
              margin: 0 auto;
              padding: 0;      /* Remove padding, will be handled by PDF margins */
              line-height: 1.5;
            }
            
            pre {
              background: #f6f8fa;
              border-radius: 6px;
              padding: 16px;
              overflow: auto;
              font-size: 85%;
              line-height: 1.45;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            }
            
            code {
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
              font-size: 85%;
              padding: 0.2em 0.4em;
              background: rgba(27,31,35,0.05);
              border-radius: 3px;
            }
            
            .hljs-keyword { color: #d73a49; }
            .hljs-string { color: #032f62; }
            .hljs-number { color: #005cc5; }
            .hljs-function { color: #6f42c1; }
            .hljs-comment { color: #6a737d; }
            .hljs-title { color: #6f42c1; }
            
            img {
              display: block;
              max-width: 100%;
              width: auto;
              height: auto;
              margin: 1em auto;
              border-radius: 4px;
              object-fit: contain;
            }
            
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            
            table, th, td {
              border: 1px solid #dfe2e5;
            }
            
            th, td {
              padding: 8px 12px;
              text-align: left;
            }
            
            th {
              background-color: #f6f8fa;
              font-weight: bold;
            }

            tr:nth-child(even) {
              background-color: #f8f8f8;
            }
            
            ${this.options.style ? fsSync.readFileSync(this.options.style, 'utf-8') : ''}
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }

  async convert(input: string): Promise<void> {
    const inputDir = path.dirname(path.resolve(input));
    const output = this.options.output
      ? path.join(this.options.output, path.basename(input, '.md') + '.html')
      : input.replace(/\.md$/, '.html');

    process.chdir(inputDir);

    const markdown = await fs.readFile(input, 'utf-8');
    const html = await this.generateHtml(markdown);

    await fs.writeFile(output, html);
    console.log(`HTML created: ${output}`);
  }
}
