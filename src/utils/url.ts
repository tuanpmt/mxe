import { createHash } from 'crypto';

/**
 * Check if a string is a valid URL
 */
export function isURL(str: string): boolean {
  try {
    new URL(str);
    return str.startsWith('http://') || str.startsWith('https://');
  } catch {
    return false;
  }
}

export function generateSafeFilename(url: string): string {
  const urlObj = new URL(url);

  // Extract domain without TLD
  const domain = urlObj.hostname.split('.')[0];

  // Get path segments
  const pathSegments = urlObj.pathname
    .split('/')
    .filter(segment => segment && segment.length > 0);

  // Use last path segment or 'article' if none
  const lastSegment = pathSegments.pop() || 'article';

  // Combine domain and last segment
  let filename = `${domain}-${lastSegment}`;

  // If still too long, use hash
  if (filename.length > 30) {
    const hash = createHash('md5').update(url).digest('hex').slice(0, 8);
    filename = `${domain}-${hash}`;
  }

  // Clean up filename
  return filename
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 30);
}
