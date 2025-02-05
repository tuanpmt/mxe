# Markdown Export Tool (MXE)

A command-line tool for converting Markdown files to PDF, DOCX, HTML formats and downloading web articles as Markdown.

## Features

- Convert Markdown to PDF, DOCX, or HTML
- Copy Markdown to clipboard
- Download web articles as Markdown with image assets
- Custom styling support
- URL to Markdown conversion

## AI Tools Integration

MXE is particularly useful when working with modern AI tools:

- Use with GitHub Copilot for easy markdown editing and collaboration
- Convert web articles to markdown for better AI tools interaction
- Maintain content in markdown format for optimal AI processing
- Export to other formats (PDF, DOCX) only when needed
- Perfect for AI-assisted documentation workflows

## Installation

```bash
npm install -g mxe
```

## Usage

```bash
mxe <input> [options]
```

Input can be:

- A local Markdown file
- A URL to download and convert
- Multiple files using glob patterns

### Examples

```bash
# Convert Markdown to PDF (default)
mxe document.md

# Convert to DOCX
mxe document.md --format docx

# Convert to HTML
mxe document.md --format html

# Copy to clipboard
mxe document.md --format clipboard

# Download article from URL and convert
mxe https://example.com/article --format pdf

# Specify output directory
mxe document.md --output ./exports

# Convert with custom styling
mxe document.md --style custom.css
```

## Options

- `-f, --format <type>`: Output format (pdf, docx, html, clipboard)
- `-s, --style <file>`: Custom CSS file for styling
- `-o, --output <dir>`: Specify output directory

## Development

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher

### Setup

1. Clone the repository

```bash
git clone https://github.com/tuanpmt/mxe.git
cd mxe
```

2. Install dependencies

```bash
npm install
```

3. Build the project

```bash
npm run build
```

4. Run in development mode

```bash
npm run dev
```

### Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Useful Links

- [Report Issues](https://github.com/tuanpmt/mxe/issues)
- [Markdown Guide](https://www.markdownguide.org/)
- [Pandoc Documentation](https://pandoc.org/MANUAL.html)
- [GitHub Repository](https://github.com/tuanpmt/mxe)

## License

MIT © 2025 Tuan PM <tuanpm@live.com>
