export type Format = 'pdf' | 'docx' | 'html' | 'clipboard';

export interface ConverterOptions {
  style?: string;
  output?: string;
}

export abstract class BaseConverter {
  protected options: ConverterOptions;

  constructor(options: ConverterOptions = {}) {
    this.options = options;
  }

  abstract convert(input: string): Promise<void>;
}
