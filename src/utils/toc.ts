import { Heading } from '../converters/base';

/**
 * Generate a slug from heading text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim();
}

/**
 * Extract headings from markdown
 */
export function extractHeadings(markdown: string, maxDepth: number = 3): Heading[] {
  const headings: Heading[] = [];
  const lines = markdown.split('\n');
  const usedSlugs = new Map<string, number>();

  for (const line of lines) {
    // Match ATX-style headings: # Heading, ## Heading, etc.
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      if (level <= maxDepth) {
        const text = match[2].trim();
        let slug = slugify(text);
        
        // Handle duplicate slugs
        if (usedSlugs.has(slug)) {
          const count = usedSlugs.get(slug)! + 1;
          usedSlugs.set(slug, count);
          slug = `${slug}-${count}`;
        } else {
          usedSlugs.set(slug, 0);
        }

        headings.push({ level, text, id: slug });
      }
    }
  }

  return headings;
}

/**
 * Generate HTML table of contents
 */
export function generateTocHtml(headings: Heading[]): string {
  if (headings.length === 0) {
    return '';
  }

  let html = '<nav class="table-of-contents">\n';
  html += '<h2 class="toc-title">Table of Contents</h2>\n';
  html += '<ul class="toc-list">\n';

  let prevLevel = headings[0]?.level || 1;

  for (const heading of headings) {
    // Handle nesting
    if (heading.level > prevLevel) {
      for (let i = prevLevel; i < heading.level; i++) {
        html += '<ul>\n';
      }
    } else if (heading.level < prevLevel) {
      for (let i = heading.level; i < prevLevel; i++) {
        html += '</ul>\n';
      }
    }

    html += `<li><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>\n`;
    prevLevel = heading.level;
  }

  // Close remaining lists
  for (let i = 1; i < prevLevel; i++) {
    html += '</ul>\n';
  }

  html += '</ul>\n';
  html += '</nav>\n';

  return html;
}

/**
 * Get CSS for TOC styling
 */
export function getTocStyles(): string {
  return `
    .table-of-contents {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1.5em;
      margin: 1.5em 0;
      page-break-inside: avoid;
    }

    .toc-title {
      margin: 0 0 0.75em 0;
      font-size: 1.1em;
      color: #333;
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 0.5em;
    }

    .toc-list {
      margin: 0;
      padding-left: 1.5em;
      list-style-type: none;
    }

    .toc-list li {
      margin: 0.4em 0;
      line-height: 1.4;
    }

    .toc-list a {
      color: #0066cc;
      text-decoration: none;
    }

    .toc-list a:hover {
      text-decoration: underline;
    }

    .toc-list ul {
      margin: 0.25em 0;
      padding-left: 1.5em;
      list-style-type: none;
    }
  `;
}

/**
 * Add IDs to headings in HTML for anchor links
 */
export function addHeadingIds(html: string, headings: Heading[]): string {
  let result = html;
  
  for (const heading of headings) {
    // Match heading tag and add id
    const regex = new RegExp(
      `(<h${heading.level}>)(${escapeRegex(escapeHtml(heading.text))})(<\\/h${heading.level}>)`,
      'i'
    );
    result = result.replace(
      regex,
      `<h${heading.level} id="${heading.id}">$2</h${heading.level}>`
    );
  }

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
