/**
 * Format a number with thousands separators
 * @param value Number to format
 * @param locale Locale to use for formatting (defaults to browser locale)
 * @returns Formatted number string
 */
export function formatNumber(value: number | undefined | null, locale?: string): string {
  return new Intl.NumberFormat(locale).format(value || 0);
}

/**
 * Format a number as a compact representation (e.g., 1.2k, 5.3M)
 * @param value Number to format
 * @param locale Locale to use for formatting (defaults to browser locale)
 * @returns Formatted compact number string
 */
export function formatCompactNumber(value: number | undefined | null, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value || 0);
}

/**
 * Format a number as a currency
 * @param value Number to format
 * @param currency Currency code (e.g., 'USD', 'EUR')
 * @param locale Locale to use for formatting (defaults to browser locale)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | undefined | null, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(value || 0);
} 
