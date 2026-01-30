/**
 * Publishing platform data for book distribution
 * Comprehensive list of self-publishing and traditional channels
 */

export interface Platform {
  value: string;
  label: string;
  url?: string;  // Base URL for the platform
  icon?: string; // Icon identifier
}

export const PUBLISHING_PLATFORMS: Platform[] = [
  { value: 'kdp', label: 'Amazon KDP', url: 'https://kdp.amazon.com' },
  { value: 'apple', label: 'Apple Books', url: 'https://books.apple.com' },
  { value: 'kobo', label: 'Kobo Writing Life', url: 'https://www.kobo.com/writinglife' },
  { value: 'google', label: 'Google Play Books', url: 'https://play.google.com/books' },
  { value: 'barnes_noble', label: 'Barnes & Noble Press', url: 'https://press.barnesandnoble.com' },
  { value: 'smashwords', label: 'Smashwords', url: 'https://www.smashwords.com' },
  { value: 'draft2digital', label: 'Draft2Digital', url: 'https://www.draft2digital.com' },
  { value: 'ingram', label: 'IngramSpark', url: 'https://www.ingramspark.com' },
  { value: 'lulu', label: 'Lulu', url: 'https://www.lulu.com' },
  { value: 'other', label: 'Other' },
];
