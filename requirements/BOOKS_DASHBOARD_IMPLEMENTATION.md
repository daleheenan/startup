# Books Dashboard - Implementation Status

## Overview

Frontend implementation for the Books Dashboard - a cross-project view showing ALL books with filtering, stats, and management capabilities.

---

## Completed Files

### 1. Constants & Data
- **`app/lib/book-data/index.ts`**
  - `PUBLICATION_STATUSES`: 5 statuses (draft, beta_readers, editing, submitted, published) with colour mapping
  - `PUBLISHING_PLATFORMS`: 8 platforms (KDP, Apple Books, Kobo, Google Play, etc.)
  - Helper functions: `getStatusColour()`, `getStatusLabel()`

### 2. Components

#### **`app/components/books/StatusBadge.tsx`**
- Coloured badge component for publication status
- 5 colour variants (blue/purple/yellow/orange/green)
- Size variants: sm, md
- WCAG AA compliant colours

#### **`app/components/books/BooksDashboardStats.tsx`**
- Stats cards row with 4 metrics:
  - Total books count
  - Total words (formatted: "680K words")
  - Published count (green highlight)
  - In Progress count
- Responsive grid layout

#### **`app/components/books/BooksFilters.tsx`**
- Filter bar with 5 controls:
  - Pen name dropdown (populated from data)
  - Status multi-select dropdown (checkboxes)
  - Genre dropdown (populated from data)
  - Search input with 500ms debounce
  - Clear filters button (shown when filters active)
- Click-outside detection for status dropdown

#### **`app/components/books/BooksTable.tsx`**
- Sortable data table with 7 columns:
  - Checkbox (for bulk selection)
  - Title (sortable, links to book detail)
  - Pen Name (sortable)
  - Series (sortable)
  - Status (sortable, shown as coloured badge)
  - Words (sortable, formatted)
  - Actions (View button)
- Row hover states
- Empty state message
- Select all checkbox in header

#### **`app/components/books/index.ts`**
- Barrel export for clean imports

### 3. Hooks

#### **`app/hooks/useBooksData.ts`**
- Custom hook for fetching books data
- Accepts filters (penName, statuses, genre, search)
- Supports pagination (page, pageSize)
- Returns:
  - `books`: Array of BookTableRow
  - `stats`: Aggregate statistics
  - `isLoading`: Boolean loading state
  - `error`: Error message string
  - `refetch()`: Manual refetch function
  - `pagination`: Page info (page, pageSize, total, totalPages)
- Calls `GET /api/books/all` with query params

### 4. Pages

#### **`app/books/page.tsx`**
- Main Books Dashboard page
- Uses DashboardLayout wrapper
- Page header: "Books" with subtitle
- Components rendered:
  - BooksDashboardStats (aggregate metrics)
  - BooksFilters (filter bar)
  - BooksTable (data table)
  - Pagination controls (prev/next buttons, page info)
- Local client-side sorting
- Loading state (spinner)
- Error banner
- Manages selected books state for bulk actions

---

## Not Yet Implemented

### Backend API Endpoint

**`backend/src/routes/books.ts`** - New route file needed

**Endpoint**: `GET /api/books/all`

**Query Parameters**:
- `page` (number, default: 1)
- `pageSize` (number, default: 20)
- `penName` (string, optional)
- `genre` (string, optional)
- `search` (string, optional) - searches title
- `statuses` (string, optional) - comma-separated list

**Response Structure**:
```typescript
{
  books: Array<{
    id: string;
    title: string;
    penName?: string;        // From pen_names table JOIN
    series?: string;          // From series table JOIN
    status: string;           // Publication status
    words: number;            // word_count from books table
    projectId: string;        // For navigation
  }>,
  stats: {
    totalBooks: number;
    totalWords: number;
    publishedCount: number;
    inProgressCount: number;
  },
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }
}
```

**Implementation Notes**:
- Join `books` with `projects` table to get genre
- Join with `pen_names` table if pen name foreign key exists
- Join with `series` table if series foreign key exists
- Filter by query params
- Calculate aggregate stats before pagination
- Apply pagination to books array
- Count statuses: published = 'published', in_progress = all others

**Database Schema Notes**:
Current `books` table has:
- `id`, `project_id`, `book_number`, `title`, `status`, `word_count`
- Status values: 'setup', 'generating', 'completed'

May need migration to add:
- `publication_status` (draft/beta_readers/editing/submitted/published)
- `pen_name_id` (FK to pen_names table)
- `series_id` (FK to series table)
- `isbn`, `publication_date`, `blurb`, `keywords`, `platforms`

### Additional Pages

#### **`app/books/[id]/page.tsx`** - Book Detail/Edit Page

Components needed:
- **BookHeader**: Cover image, title, series, pen name, status
- **BookMetadataForm**: ISBN, publication date, blurb, keywords, platforms, cover upload
- **StatusPipeline**: Visual workflow (5 steps, click to change status)

#### **`app/components/books/BookMetadataForm.tsx`**
- Form fields:
  - ISBN (with validation: 10 or 13 digits)
  - Publication date picker
  - Publication status select
  - Blurb textarea with character count
  - Keywords editor (KeywordsEditor component)
  - Platforms checklist (checkboxes for 8 platforms)
  - Cover image upload (CoverImageUpload component)

#### **`app/components/books/StatusPipeline.tsx`**
- Horizontal row of 5 status steps
- Visual states:
  - Current status: highlighted, bold
  - Completed steps: checkmark icon
  - Future steps: greyed out
- Click step to change status (with confirmation dialog)

#### **`app/components/books/KeywordsEditor.tsx`**
- Tag input component
- Type keyword and press Enter to add
- Click X on tag to remove
- Max 7 keywords enforced
- Shows count: "3 / 7 keywords"

---

## Integration Requirements

### Database Schema Extensions

Create migration for `books` table enhancements:

```sql
-- Add publication metadata columns to books table
ALTER TABLE books ADD COLUMN publication_status TEXT DEFAULT 'draft' CHECK(publication_status IN ('draft', 'beta_readers', 'editing', 'submitted', 'published'));
ALTER TABLE books ADD COLUMN pen_name_id TEXT REFERENCES pen_names(id);
ALTER TABLE books ADD COLUMN series_id TEXT REFERENCES series(id);
ALTER TABLE books ADD COLUMN isbn TEXT;
ALTER TABLE books ADD COLUMN publication_date TEXT;
ALTER TABLE books ADD COLUMN blurb TEXT;
ALTER TABLE books ADD COLUMN keywords TEXT;  -- JSON array
ALTER TABLE books ADD COLUMN platforms TEXT; -- JSON array
ALTER TABLE books ADD COLUMN cover_image_url TEXT;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_books_publication_status ON books(publication_status);
CREATE INDEX IF NOT EXISTS idx_books_pen_name ON books(pen_name_id);
CREATE INDEX IF NOT EXISTS idx_books_series ON books(series_id);
```

### Sidebar Navigation

Add "Books" link to sidebar navigation (app/components/dashboard/Sidebar/index.tsx):

```typescript
{
  id: 'books',
  label: 'Books',
  href: '/books',
  icon: BookIcon,
}
```

---

## Testing Checklist

### Frontend Components
- [ ] StatusBadge renders all 5 status variants correctly
- [ ] BooksDashboardStats calculates and displays metrics
- [ ] BooksFilters dropdowns populate from data
- [ ] BooksFilters debounce search works (500ms delay)
- [ ] BooksFilters status multi-select allows multiple selections
- [ ] BooksFilters clear button resets all filters
- [ ] BooksTable sortable headers change sort direction on click
- [ ] BooksTable row click navigates to book detail page
- [ ] BooksTable empty state shows when no books
- [ ] BooksTable select all checkbox selects all rows
- [ ] Books page pagination prev/next buttons work correctly
- [ ] Books page loading state shows spinner
- [ ] Books page error banner displays API errors

### Backend API
- [ ] GET /api/books/all returns correct data structure
- [ ] Filtering by penName works
- [ ] Filtering by genre works
- [ ] Filtering by search (title) works
- [ ] Filtering by statuses (comma-separated) works
- [ ] Pagination returns correct page subset
- [ ] Stats calculation is accurate (totalBooks, totalWords, counts)
- [ ] Response includes correct pagination metadata
- [ ] Handles empty results gracefully
- [ ] Auth token validation works

### Integration
- [ ] Books page fetches data on mount
- [ ] Filters trigger refetch with correct query params
- [ ] Pagination triggers refetch with correct page
- [ ] Selected books state persists during filter changes
- [ ] Navigation to book detail page works
- [ ] Back navigation from book detail returns to filtered state

---

## Next Steps

1. **Create database migration** for books table enhancements (publication_status, pen_name_id, series_id, ISBN, etc.)
2. **Implement backend API endpoint** `GET /api/books/all` with filtering and pagination
3. **Create book detail page** (`app/books/[id]/page.tsx`)
4. **Implement BookMetadataForm** component
5. **Implement StatusPipeline** component
6. **Implement KeywordsEditor** component
7. **Add Books link to sidebar** navigation
8. **Write integration tests** for full workflow

---

## Files Created

### Frontend
1. `app/lib/book-data/index.ts` (Constants)
2. `app/components/books/StatusBadge.tsx`
3. `app/components/books/BooksDashboardStats.tsx`
4. `app/components/books/BooksFilters.tsx`
5. `app/components/books/BooksTable.tsx`
6. `app/components/books/index.ts` (Barrel export)
7. `app/hooks/useBooksData.ts`
8. `app/books/page.tsx`
9. `app/hooks/index.ts` (Updated with useBooksData export)

### Documentation
10. `requirements/BOOKS_DASHBOARD_IMPLEMENTATION.md` (This file)

**Total**: 10 files created/modified

---

## Design Patterns Used

- **Barrel exports**: Components and hooks organised with index.ts for clean imports
- **Design tokens**: All styling uses centralised tokens from `app/lib/design-tokens.ts`
- **UK spelling**: "colour" not "color" throughout
- **Inline styles**: Following existing codebase pattern (no CSS modules)
- **Debouncing**: Search input uses 500ms debounce to reduce API calls
- **Client-side sorting**: Table sorting handled in React (could be moved to backend)
- **Loading states**: Spinner shown during data fetch
- **Empty states**: Friendly message when no data
- **Accessibility**: ARIA labels, semantic HTML, WCAG AA contrast
- **Type safety**: Full TypeScript typing throughout
- **Error handling**: Try-catch with error state display

---

## API Contract

The frontend expects this API response shape from `GET /api/books/all`:

```typescript
interface BooksAPIResponse {
  books: BookTableRow[];
  stats: BookStats;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

Ensure backend implementation matches this contract for seamless integration.
