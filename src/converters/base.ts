export type Format = 'pdf' | 'docx' | 'html' | 'clipboard';

export type MermaidTheme = 'default' | 'forest' | 'dark' | 'neutral' | 'base';
export type MermaidLayout = 'dagre' | 'elk';

export type FontFamily = 
  | 'lato' 
  | 'roboto' 
  | 'inter' 
  | 'opensans' 
  | 'source-sans'
  | 'merriweather'
  | 'jetbrains-mono'
  | 'fira-code'
  | 'source-code';

export interface MermaidOptions {
  theme?: MermaidTheme;
  layout?: MermaidLayout;
  handDraw?: boolean;
}

export interface ConverterOptions {
  style?: string;
  output?: string;
  toc?: boolean;
  tocDepth?: number;
  bookmarks?: boolean;
  mermaid?: MermaidOptions;
  highlightTheme?: string;
  font?: FontFamily;
  monoFont?: FontFamily;
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export abstract class BaseConverter {
  protected options: ConverterOptions;

  constructor(options: ConverterOptions = {}) {
    this.options = {
      toc: false,
      tocDepth: 3,
      bookmarks: true,
      mermaid: {
        theme: 'default',
        layout: 'dagre',
        handDraw: false,
      },
      highlightTheme: 'github',
      font: 'inter',
      monoFont: 'jetbrains-mono',
      ...options,
    };
  }

  abstract convert(input: string): Promise<void>;
}
