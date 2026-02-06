#!/usr/bin/env node

import { program } from 'commander';
import { convert } from './commands/convert';

const { version } = require('../package.json');

program
  .name('mxe')
  .description('Markdown Export Tool - Convert Markdown to PDF/DOCX/HTML with Mermaid support')
  .version(version)
  .argument('<input>', 'input markdown file or URL')
  .option('-f, --format <type>', 'output format: pdf, docx, html, clipboard (default: pdf)')
  .option('-s, --style <file>', 'custom CSS file for styling')
  .option('-o, --output <dir>', 'output directory')
  
  // TOC options
  .option('--toc', 'generate table of contents')
  .option('--toc-depth <n>', 'TOC heading depth (default: 3)', parseInt)
  
  // Bookmark options
  .option('--no-bookmarks', 'disable PDF bookmarks')
  
  // Mermaid options
  .option('--mermaid-theme <theme>', 'mermaid theme: default, forest, dark, neutral, base')
  .option('--mermaid-layout <layout>', 'mermaid layout: dagre, elk')
  .option('--hand-draw', 'use hand-drawn/sketch style for mermaid diagrams')
  
  // Syntax highlighting
  .option('--highlight-theme <theme>', 'syntax highlight theme: github (default)')
  
  // Font options
  .option('--font <family>', 'body font: inter, roboto, lato, opensans, source-sans, merriweather')
  .option('--mono-font <family>', 'code font: jetbrains-mono, fira-code, source-code')
  
  .action(convert);

program.parse();
