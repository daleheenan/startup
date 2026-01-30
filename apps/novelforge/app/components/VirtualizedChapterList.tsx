'use client';

/**
 * VirtualizedChapterList - High-performance chapter list component
 *
 * Uses @tanstack/react-virtual to render only visible chapters,
 * dramatically improving performance for books with 100+ chapters.
 *
 * Features:
 * - Virtual scrolling (renders only visible items + overscan)
 * - Scroll position restoration
 * - Keyboard navigation
 * - Supports dynamic item heights
 */

import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  status: 'pending' | 'writing' | 'editing' | 'completed';
  word_count: number;
  summary?: string;
}

interface VirtualizedChapterListProps {
  chapters: Chapter[];
  onChapterClick?: (chapter: Chapter) => void;
  selectedChapterId?: string;
  estimatedItemHeight?: number;
  overscan?: number;
}

/**
 * Get status badge color based on chapter status
 */
function getStatusColor(status: Chapter['status']): string {
  switch (status) {
    case 'completed':
      return '#10b981'; // Green
    case 'editing':
      return '#f59e0b'; // Orange
    case 'writing':
      return '#3b82f6'; // Blue
    case 'pending':
      return '#9ca3af'; // Gray
    default:
      return '#9ca3af';
  }
}

/**
 * Get status badge text
 */
function getStatusText(status: Chapter['status']): string {
  switch (status) {
    case 'completed':
      return 'Complete';
    case 'editing':
      return 'Editing';
    case 'writing':
      return 'Writing';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

export default function VirtualizedChapterList({
  chapters,
  onChapterClick,
  selectedChapterId,
  estimatedItemHeight = 120,
  overscan = 5,
}: VirtualizedChapterListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: chapters.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan,
  });

  // Save scroll position on unmount for restoration
  useEffect(() => {
    const saveScrollPosition = () => {
      if (parentRef.current) {
        scrollPositionRef.current = parentRef.current.scrollTop;
      }
    };

    return saveScrollPosition;
  }, []);

  // Restore scroll position on mount (if available)
  useEffect(() => {
    if (parentRef.current && scrollPositionRef.current > 0) {
      parentRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, chapter: Chapter) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onChapterClick?.(chapter);
      }
    },
    [onChapterClick]
  );

  // Get virtual items to render
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      style={{
        height: '600px',
        overflow: 'auto',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        position: 'relative',
      }}
      role="list"
      aria-label="Chapter list"
    >
      {/* Total height container for scroll behavior */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Render only visible items */}
        {virtualItems.map((virtualItem) => {
          const chapter = chapters[virtualItem.index];
          const isSelected = chapter.id === selectedChapterId;

          return (
            <div
              key={chapter.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div
                role="listitem"
                tabIndex={0}
                onClick={() => onChapterClick?.(chapter)}
                onKeyDown={(e) => handleKeyDown(e, chapter)}
                style={{
                  padding: '16px',
                  margin: '0 8px 8px 8px',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: onChapterClick ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && onChapterClick) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
                onFocus={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }
                }}
                onBlur={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                {/* Header row with chapter number, title, and status */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: '#6b7280',
                        minWidth: '32px',
                      }}
                    >
                      #{chapter.chapter_number}
                    </span>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937',
                      }}
                    >
                      {chapter.title || `Chapter ${chapter.chapter_number}`}
                    </h3>
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#ffffff',
                      backgroundColor: getStatusColor(chapter.status),
                    }}
                  >
                    {getStatusText(chapter.status)}
                  </div>
                </div>

                {/* Word count */}
                {chapter.word_count > 0 && (
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      marginBottom: chapter.summary ? '8px' : '0',
                    }}
                  >
                    {chapter.word_count.toLocaleString()} words
                  </div>
                )}

                {/* Summary (if available) */}
                {chapter.summary && (
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#4b5563',
                      lineHeight: '1.5',
                      marginTop: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {chapter.summary}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {chapters.length === 0 && (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#9ca3af',
          }}
        >
          <p style={{ margin: 0, fontSize: '16px' }}>No chapters yet</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
            Generate an outline to create chapters
          </p>
        </div>
      )}
    </div>
  );
}
