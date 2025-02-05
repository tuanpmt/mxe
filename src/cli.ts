#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { convert } from './commands/convert';

const { version } = require('../package.json');

// Create example.md for development if it doesn't exist
if (process.env.NODE_ENV === 'development') {
  const examplePath = path.join(process.cwd(), 'example.md');
  if (!fs.existsSync(examplePath)) {
    fs.writeFileSync(examplePath, '# Example Document\n\nThis is a test file.');
  }
}

program
  .name('mxe')
  .description('Markdown Export Tool (PDF format by default)')
  .version(version)
  .argument('<input>', 'input markdown file or URL')
  .option('-f, --format <type>', 'output format (pdf, docx, or clipboard)')
  .option('-s, --style <file>', 'custom CSS file for styling')
  .option('-o, --output <dir>', 'specify output directory')
  .action(convert);

// Use example.md as default in development mode
if (process.env.NODE_ENV === 'development' && process.argv.length === 2) {
  process.argv.push('example.md');
}

program.parse();
