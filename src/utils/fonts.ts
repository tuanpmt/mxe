import { FontFamily } from '../converters/base';

interface FontConfig {
  name: string;
  googleFont: string;
  weights: string;
  fallback: string;
  isMonospace?: boolean;
}

const FONT_CONFIG: Record<FontFamily, FontConfig> = {
  // Sans-serif fonts
  'lato': {
    name: 'Lato',
    googleFont: 'Lato',
    weights: '400;400i;700;700i',
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  'roboto': {
    name: 'Roboto',
    googleFont: 'Roboto',
    weights: '400;400i;500;700;700i',
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  'inter': {
    name: 'Inter',
    googleFont: 'Inter',
    weights: '400;500;600;700',
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  'opensans': {
    name: 'Open Sans',
    googleFont: 'Open+Sans',
    weights: '400;400i;600;700;700i',
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  'source-sans': {
    name: 'Source Sans 3',
    googleFont: 'Source+Sans+3',
    weights: '400;400i;600;700;700i',
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  
  // Serif fonts
  'merriweather': {
    name: 'Merriweather',
    googleFont: 'Merriweather',
    weights: '400;400i;700;700i',
    fallback: 'Georgia, "Times New Roman", serif',
  },
  
  // Monospace fonts
  'jetbrains-mono': {
    name: 'JetBrains Mono',
    googleFont: 'JetBrains+Mono',
    weights: '400;500;700',
    fallback: '"SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    isMonospace: true,
  },
  'fira-code': {
    name: 'Fira Code',
    googleFont: 'Fira+Code',
    weights: '400;500;700',
    fallback: '"SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    isMonospace: true,
  },
  'source-code': {
    name: 'Source Code Pro',
    googleFont: 'Source+Code+Pro',
    weights: '400;500;700',
    fallback: '"SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    isMonospace: true,
  },
};

/**
 * Get Google Fonts import URL
 */
export function getGoogleFontsUrl(fonts: FontFamily[]): string {
  const fontParams = fonts
    .filter(f => FONT_CONFIG[f])
    .map(f => {
      const config = FONT_CONFIG[f];
      return `family=${config.googleFont}:ital,wght@${config.weights.split(';').map((w, i) => {
        // Handle italic variants
        if (w.includes('i')) {
          return `1,${w.replace('i', '')}`;
        }
        return `0,${w}`;
      }).join(';')}`;
    })
    .join('&');

  return `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
}

/**
 * Get simpler Google Fonts URL
 */
export function getSimpleGoogleFontsUrl(fonts: FontFamily[]): string {
  const families = fonts
    .filter(f => FONT_CONFIG[f])
    .map(f => {
      const config = FONT_CONFIG[f];
      return `${config.googleFont}:wght@400;500;600;700`;
    })
    .join('&family=');

  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
}

/**
 * Get font-family CSS value
 */
export function getFontFamily(font: FontFamily): string {
  const config = FONT_CONFIG[font];
  if (!config) return 'sans-serif';
  return `"${config.name}", ${config.fallback}`;
}

/**
 * Get font config
 */
export function getFontConfig(font: FontFamily): FontConfig | undefined {
  return FONT_CONFIG[font];
}

/**
 * Check if font is monospace
 */
export function isMonospace(font: FontFamily): boolean {
  return FONT_CONFIG[font]?.isMonospace ?? false;
}

/**
 * Get available fonts list
 */
export function getAvailableFonts(): { id: FontFamily; name: string; type: string }[] {
  return Object.entries(FONT_CONFIG).map(([id, config]) => ({
    id: id as FontFamily,
    name: config.name,
    type: config.isMonospace ? 'monospace' : (config.fallback.includes('serif') && !config.fallback.includes('sans') ? 'serif' : 'sans-serif'),
  }));
}
