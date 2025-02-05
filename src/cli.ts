#!/usr/bin/env node

import { program } from 'commander';
import { convert } from './commands/convert';

const { version } = require('../package.json');

program
  .name('mxe')
  .description('Markdown Export Tool (PDF format by default)')
  .version(version)
  .argument('<input>', 'input markdown file or URL')
  .option('-f, --format <type>', 'output format (pdf, docx, or clipboard)')
  .option('-s, --style <file>', 'custom CSS file for styling')
  .option('-o, --output <dir>', 'specify output directory')
  .action(convert);

program.parse();
