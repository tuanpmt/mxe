import MarkdownIt from 'markdown-it';
import { marked } from 'marked';

export function createMarkdownParser(options?: MarkdownIt.Options): MarkdownIt {
  return new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
    ...options,
  })
    .use(require('markdown-it-table'))
    .use(require('markdown-it-link-attributes'), {
      pattern: /^https?:\/\//,
      attrs: {
        target: '_blank',
        rel: 'noopener',
      },
    });
}

export async function convertToHtml(markdown: string): Promise<string> {
  return marked.parse(markdown);
}

export function generateToc(markdown: string): string {
  const md = createMarkdownParser();
  const tokens = md.parse(markdown, {});
  const toc: string[] = [];

  tokens.forEach((token, index) => {
    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.substring(1));
      const content = tokens[index + 1].content;
      const indent = '  '.repeat(level - 1);
      toc.push(`${indent}- ${content}`);
    }
  });

  return toc.join('\n');
}

export function cleanupMarkdown(markdown: string): string {
  return (
    markdown
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Fix code blocks
      .replace(/```\s+```/g, '')
      // Fix multiple code block markers
      .replace(/`{4,}/g, '```')
      // Remove empty lines between sections
      .replace(/\n{3,}/g, '\n\n')
      // Remove lines that only contain whitespace
      .replace(/^\s+$/gm, '')
      // Remove social media and share buttons
      .replace(/(?:Share|Tweet|Pin|Follow).*$/gm, '')
      // Remove common unnecessary elements
      .replace(/^Related Articles.*$/gm, '')
      .replace(/^Tags:.*$/gm, '')
      .replace(/^Author:.*$/gm, '')
      // Fix broken lists
      .replace(/(?:\n\n[-*+])/g, '\n-')
      // Remove multiple sequential spaces
      .replace(/ +/g, ' ')
      // Fix heading spaces
      .replace(/####\s*/g, '#### ')
      .replace(/###\s*/g, '### ')
      .replace(/##\s*/g, '## ')
      .replace(/#\s*/g, '# ')
      // Clean up remaining whitespace
      .trim()
  );
}
