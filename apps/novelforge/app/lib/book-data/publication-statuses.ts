/**
 * Publication status definitions for book workflow
 * Tracks progress from draft through to publication
 */

export interface PublicationStatus {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const PUBLICATION_STATUSES: PublicationStatus[] = [
  {
    value: 'draft',
    label: 'Draft',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    description: 'Initial writing phase'
  },
  {
    value: 'beta_readers',
    label: 'Beta Readers',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    description: 'Out with beta readers for feedback'
  },
  {
    value: 'editing',
    label: 'Editing',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Professional editing in progress'
  },
  {
    value: 'submitted',
    label: 'Submitted',
    color: '#F97316',
    bgColor: '#FFEDD5',
    description: 'Submitted to platforms, awaiting publication'
  },
  {
    value: 'published',
    label: 'Published',
    color: '#10B981',
    bgColor: '#D1FAE5',
    description: 'Live and available for purchase'
  },
];

/**
 * Get publication status object by value
 */
export function getStatusByValue(value: string): PublicationStatus | undefined {
  return PUBLICATION_STATUSES.find(s => s.value === value);
}

/**
 * Get the next status in the workflow
 */
export function getNextStatus(currentValue: string): PublicationStatus | undefined {
  const currentIndex = PUBLICATION_STATUSES.findIndex(s => s.value === currentValue);
  if (currentIndex === -1 || currentIndex === PUBLICATION_STATUSES.length - 1) return undefined;
  return PUBLICATION_STATUSES[currentIndex + 1];
}
