import {
  BorderStyle,
  HeadingLevel,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import hljs from 'highlight.js';
import sharp from 'sharp';

export async function getImageDimensions(
  base64Data: string
): Promise<{ width: number; height: number }> {
  try {
    const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
    const metadata = await sharp(buffer).metadata();

    const maxWidth = 550;
    const maxHeight = 750;

    let width = metadata.width || maxWidth;
    let height = metadata.height || maxHeight;

    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }

    if (height > maxHeight) {
      const ratio = maxHeight / height;
      height = maxHeight;
      width = Math.round(width * ratio);
    }

    return { width, height };
  } catch (error) {
    console.warn('Error calculating image dimensions:', error);
    return { width: 500, height: 300 };
  }
}

export function getHeadingLevel(level: number): keyof typeof HeadingLevel {
  const headingLevels: Record<number, keyof typeof HeadingLevel> = {
    1: 'HEADING_1',
    2: 'HEADING_2',
    3: 'HEADING_3',
    4: 'HEADING_4',
    5: 'HEADING_5',
    6: 'HEADING_6',
  };
  return headingLevels[level] || 'HEADING_1';
}

export function createTableCell(
  content: string,
  isHeader: boolean,
  columnCount: number
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: content || '',
            bold: isHeader,
            font: { name: 'Lato' },
            size: 24,
          }),
        ],
        alignment: 'left',
      }),
    ],
    width: {
      size: 100 / columnCount,
      type: WidthType.PERCENTAGE,
    },
    margins: {
      top: 100,
      bottom: 100,
      left: 150,
      right: 150,
    },
    verticalAlign: VerticalAlign.CENTER,
    shading: isHeader ? { fill: 'E7E7E7' } : undefined,
  });
}

export function createCodeBlock(text: string, lang?: string): Paragraph {
  const code = text
    .trim()
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  let highlighted: string;

  try {
    highlighted =
      lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value;
  } catch {
    highlighted = code;
  }

  const lines = highlighted.split('\n');
  const runs: TextRun[] = [];

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
          currentStyle.color = colors[colorMatch[1]] || '24292e';
        }
      } else if (span === '</span>') {
        currentStyle = { color: '24292e' };
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

  return new Paragraph({
    children: runs,
    spacing: { before: 240, after: 240 },
    style: 'CodeBlock',
    shading: {
      type: 'solid',
      fill: 'F6F8FA',
    },
  });
}

export function createTable(rows: TableRow[]): Table {
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: '666666',
      },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '666666' },
    },
    layout: TableLayoutType.FIXED,
  });
}
