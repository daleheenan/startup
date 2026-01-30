# Pen Names & Book Tracking - Sprint Tasks

**Parent Document**: [pen-names-book-tracking.md](./pen-names-book-tracking.md)
**Created**: 2025-01-30
**Total Estimate**: 178 hours (~4.5 weeks)

---

## Sprint Overview

| Sprint | Focus | Duration | Story Points |
|--------|-------|----------|--------------|
| Sprint 1 | Foundation | 1 week | 40 |
| Sprint 2 | Pen Name Management | 1 week | 37 |
| Sprint 3 | Book Tracking | 1.3 weeks | 53 |
| Sprint 4 | Integration & Polish | 1.2 weeks | 48 |

**Velocity Assumption**: 40 story points per week (1 point = 1 hour)

---

# Sprint 1: Foundation

**Goal**: Complete existing infrastructure, create pen names database and API, build basic UI

**Sprint Duration**: 1 week
**Total Points**: 40

---

## Epic 1.1: Author Profile UI Completion

**Epic Goal**: Expose all existing database fields in the author profile settings page

### TASK-1.1.1: Add Personal Information Section

**Type**: Feature
**Points**: 2
**Priority**: High

**Description**:
Add a new "Personal Information" section to the author profile settings page above the existing bio section.

**Acceptance Criteria**:
- [ ] New collapsible section titled "Personal Information" appears at top of page
- [ ] Section follows existing card styling (rounded corners, shadow, padding)
- [ ] Section is expanded by default
- [ ] Section has descriptive helper text explaining its purpose

**Technical Notes**:
- File: `app/settings/author-profile/page.tsx`
- Use existing `Card` component pattern from the page
- Follow UK spelling in all labels

---

### TASK-1.1.2: Add Author Name Field

**Type**: Feature
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.1.1

**Description**:
Add the `author_name` field to the Personal Information section with label "Legal Name".

**Acceptance Criteria**:
- [ ] Text input field with label "Legal Name"
- [ ] Helper text: "Your legal name for contracts and copyright notices"
- [ ] Field saves to `author_name` column in `author_profile` table
- [ ] Field loads existing value on page load
- [ ] Maximum length: 100 characters

**Technical Notes**:
- This is the author's real/legal name, distinct from pen names
- Used for contracts, not displayed publicly

---

### TASK-1.1.3: Add Primary Pen Name Field

**Type**: Feature
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.1.1

**Description**:
Add the `pen_name` field to the Personal Information section.

**Acceptance Criteria**:
- [ ] Text input field with label "Primary Pen Name"
- [ ] Helper text: "Your default pen name (you can create additional pen names later)"
- [ ] Field saves to `pen_name` column in `author_profile` table
- [ ] Field loads existing value on page load
- [ ] Maximum length: 100 characters

**Technical Notes**:
- This is a temporary single pen name field
- Will be superseded by multi-pen name system in Sprint 2
- Keep for backwards compatibility

---

### TASK-1.1.4: Add Preferred Pronouns Dropdown

**Type**: Feature
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-1.1.1

**Description**:
Add a pronouns dropdown to the Personal Information section.

**Acceptance Criteria**:
- [ ] Dropdown with label "Preferred Pronouns"
- [ ] Options: "He/Him", "She/Her", "They/Them", "Other", "Prefer not to say"
- [ ] "Other" option shows additional text input
- [ ] Field saves to `preferred_pronouns` column
- [ ] Field loads existing value on page load

**Technical Notes**:
- Store the selected value as string
- If "Other" selected, store the custom text

---

### TASK-1.1.5: Add Contact Information Section

**Type**: Feature
**Points**: 1
**Priority**: High

**Description**:
Add a new "Contact Information" section to the author profile settings page.

**Acceptance Criteria**:
- [ ] New collapsible section titled "Contact Information"
- [ ] Section appears below Personal Information
- [ ] Helper text: "Used for agent submissions and publishing contracts"
- [ ] Section follows existing card styling
- [ ] Section is collapsed by default

**Technical Notes**:
- Contact info is sensitive, collapse by default
- Will contain multiple address fields

---

### TASK-1.1.6: Add Email and Phone Fields

**Type**: Feature
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.1.5

**Description**:
Add contact email and phone fields to Contact Information section.

**Acceptance Criteria**:
- [ ] Email input with label "Contact Email"
- [ ] Email validation (valid email format)
- [ ] Phone input with label "Phone Number"
- [ ] Phone accepts international formats
- [ ] Both fields save/load correctly

**Technical Notes**:
- Fields: `contact_email`, `contact_phone`
- Use type="email" and type="tel" for mobile keyboards

---

### TASK-1.1.7: Add Address Fields

**Type**: Feature
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.1.5

**Description**:
Add mailing address fields to Contact Information section.

**Acceptance Criteria**:
- [ ] Textarea for "Street Address" (multi-line)
- [ ] Text input for "City"
- [ ] Text input for "Postcode" (UK spelling)
- [ ] Dropdown for "Country" with common options + full list
- [ ] All fields save/load correctly
- [ ] Fields arranged in logical grid layout

**Technical Notes**:
- Fields: `contact_address`, `contact_city`, `contact_postcode`, `contact_country`
- Use ISO country codes for country dropdown
- Prioritise UK, US, Canada, Australia at top of list

---

### TASK-1.1.8: Add Writing Credentials Section

**Type**: Feature
**Points**: 1
**Priority**: Medium

**Description**:
Add a new "Writing Credentials" section to the author profile settings page.

**Acceptance Criteria**:
- [ ] New collapsible section titled "Writing Credentials"
- [ ] Section appears below Contact Information
- [ ] Helper text: "Publications, awards, and achievements for query letters"
- [ ] Section follows existing card styling
- [ ] Section is collapsed by default

**Technical Notes**:
- Used primarily for traditional publishing submissions
- Will contain dynamic list of credentials

---

### TASK-1.1.9: Create Credentials Array Editor

**Type**: Feature
**Points**: 2
**Priority**: Medium
**Depends On**: TASK-1.1.8

**Description**:
Create a component for adding/removing credential items.

**Acceptance Criteria**:
- [ ] "Add Credential" button adds new empty row
- [ ] Each row has: Type dropdown, Description text, Year (optional)
- [ ] Type options: "Publication", "Award", "Degree", "Membership", "Other"
- [ ] Delete button removes row with confirmation
- [ ] Drag handle for reordering (optional, nice-to-have)
- [ ] Saves as JSON array to `writing_credentials`
- [ ] Loads existing credentials on page load
- [ ] Empty state: "No credentials added yet"

**Technical Notes**:
- Store as JSON: `[{"type": "Award", "description": "...", "year": 2023}]`
- Component: `CredentialsEditor.tsx`

---

### TASK-1.1.10: Add Short Bio Field

**Type**: Feature
**Points**: 1
**Priority**: High

**Description**:
Add the short bio field for query letters.

**Acceptance Criteria**:
- [ ] Textarea with label "Short Bio"
- [ ] Helper text: "50-100 words for query letters and pitches"
- [ ] Live word counter showing "X / 100 words"
- [ ] Warning colour when over 100 words
- [ ] Field saves to `author_bio_short`
- [ ] Field loads existing value on page load

**Technical Notes**:
- Display below the existing full bio field
- Use same textarea styling as existing bio

---

### TASK-1.1.11: Update Author Profile API - GET

**Type**: Backend
**Points**: 1
**Priority**: High

**Description**:
Update the GET endpoint to return all author profile fields.

**Acceptance Criteria**:
- [ ] `GET /api/author-profile` returns all fields:
  - `author_name`
  - `pen_name`
  - `preferred_pronouns`
  - `author_bio_short`
  - `contact_email`, `contact_phone`
  - `contact_address`, `contact_city`, `contact_postcode`, `contact_country`
  - `writing_credentials` (parsed JSON)
- [ ] Existing fields continue to work
- [ ] Empty fields return null, not undefined

**Technical Notes**:
- File: `backend/src/routes/author-profile.ts`
- Parse `writing_credentials` JSON before returning

---

### TASK-1.1.12: Update Author Profile API - PUT

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.1.11

**Description**:
Update the PUT endpoint to save all author profile fields.

**Acceptance Criteria**:
- [ ] `PUT /api/author-profile` accepts and saves all fields
- [ ] `writing_credentials` stringified before saving
- [ ] Validation for email format
- [ ] Validation for required field lengths
- [ ] Returns updated profile on success
- [ ] Updates `updated_at` timestamp

**Technical Notes**:
- Validate but don't require fields (all optional)
- Stringify JSON fields before database insert

---

### TASK-1.1.13: Add Form Validation

**Type**: Feature
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-1.1.1 through TASK-1.1.10

**Description**:
Add client-side validation to all new form fields.

**Acceptance Criteria**:
- [ ] Email field validates email format
- [ ] Shows inline error messages below fields
- [ ] Form cannot submit with validation errors
- [ ] Validation runs on blur and on submit
- [ ] Error messages use UK spelling

**Technical Notes**:
- Use existing form validation patterns in codebase
- Consider using Zod for schema validation

---

### TASK-1.1.14: Write Author Profile Tests

**Type**: Testing
**Points**: 2
**Priority**: Medium
**Depends On**: TASK-1.1.12

**Description**:
Write tests for the updated author profile functionality.

**Acceptance Criteria**:
- [ ] API test: GET returns all fields
- [ ] API test: PUT saves all fields
- [ ] API test: Invalid email rejected
- [ ] API test: Credentials JSON stored correctly
- [ ] All tests pass

**Technical Notes**:
- Add to existing test file or create new one
- Test both success and error cases

---

## Epic 1.2: Pen Names Database

**Epic Goal**: Create database schema for multiple pen names

### TASK-1.2.1: Create Pen Names Migration

**Type**: Backend
**Points**: 1
**Priority**: High

**Description**:
Create the database migration file for the `pen_names` table.

**Acceptance Criteria**:
- [ ] Migration file created with sequential number
- [ ] Table includes all required columns:
  - `id` (TEXT PRIMARY KEY)
  - `user_id` (TEXT NOT NULL DEFAULT 'owner')
  - `pen_name` (TEXT NOT NULL)
  - `display_name` (TEXT)
  - `bio` (TEXT)
  - `bio_short` (TEXT)
  - `photo` (TEXT)
  - `photo_type` (TEXT)
  - `website` (TEXT)
  - `social_media` (TEXT - JSON)
  - `genres` (TEXT - JSON)
  - `is_public` (BOOLEAN DEFAULT 1)
  - `is_default` (BOOLEAN DEFAULT 0)
  - `deleted_at` (TEXT - soft delete)
  - `created_at`, `updated_at`
- [ ] UNIQUE constraint on (user_id, pen_name)
- [ ] Index on user_id
- [ ] Index on (user_id, is_default)
- [ ] Migration runs successfully

**Technical Notes**:
```sql
CREATE TABLE pen_names (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'owner',
    pen_name TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    bio_short TEXT,
    photo TEXT,
    photo_type TEXT,
    website TEXT,
    social_media TEXT,
    genres TEXT,
    is_public BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, pen_name)
);
```

---

### TASK-1.2.2: Add Pen Name Foreign Key to Projects

**Type**: Backend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.2.1

**Description**:
Add `pen_name_id` column to the projects table.

**Acceptance Criteria**:
- [ ] `pen_name_id` column added (nullable)
- [ ] Foreign key references `pen_names(id)`
- [ ] Index on `pen_name_id`
- [ ] Existing projects unaffected (null value)

**Technical Notes**:
- SQLite doesn't enforce FK by default, but include for documentation
- Keep existing `author_name` text field for backwards compatibility

---

### TASK-1.2.3: Add Pen Name Foreign Key to Books

**Type**: Backend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.2.1

**Description**:
Add `pen_name_id` column to the books table.

**Acceptance Criteria**:
- [ ] `pen_name_id` column added (nullable)
- [ ] Foreign key references `pen_names(id)`
- [ ] Index on `pen_name_id`
- [ ] Existing books unaffected (null value)

**Technical Notes**:
- Books can override project pen name if needed
- If null, inherit from parent project

---

### TASK-1.2.4: Create Pen Name Genres Junction Table

**Type**: Backend
**Points**: 0.5
**Priority**: Low
**Depends On**: TASK-1.2.1

**Description**:
Create junction table for pen name genre associations.

**Acceptance Criteria**:
- [ ] Table `pen_name_genres` created
- [ ] Columns: `pen_name_id`, `genre`
- [ ] Primary key on (pen_name_id, genre)
- [ ] Foreign key to pen_names

**Technical Notes**:
- Alternative to JSON genres field
- Allows efficient genre-based queries
- Optional: can use JSON field instead

---

### TASK-1.2.5: Add Database Indexes

**Type**: Backend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-1.2.1

**Description**:
Add indexes for common pen name queries.

**Acceptance Criteria**:
- [ ] Index on `pen_names(user_id)`
- [ ] Index on `pen_names(user_id, is_default)`
- [ ] Index on `pen_names(deleted_at)` for soft delete queries
- [ ] Indexes verified with EXPLAIN QUERY PLAN

**Technical Notes**:
- Partial index on deleted_at IS NULL if SQLite supports

---

### TASK-1.2.6: Create Data Migration for Existing Author Names

**Type**: Backend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-1.2.1

**Description**:
Migrate existing `author_name` values from projects to pen_names table.

**Acceptance Criteria**:
- [ ] Script identifies unique author_name values in projects
- [ ] Creates pen_name record for each unique value
- [ ] Updates project.pen_name_id to reference new records
- [ ] First pen name created is marked as default
- [ ] Migration is idempotent (can run multiple times safely)
- [ ] Logs migration actions

**Technical Notes**:
- Run as separate migration step after schema changes
- Handle null/empty author_name values
- Preserve existing author_name field (don't delete)

---

### TASK-1.2.7: Write Rollback Migration

**Type**: Backend
**Points**: 0.5
**Priority**: Low
**Depends On**: TASK-1.2.1

**Description**:
Create rollback migration for pen_names schema.

**Acceptance Criteria**:
- [ ] Drops pen_names table
- [ ] Removes pen_name_id from projects
- [ ] Removes pen_name_id from books
- [ ] Drops indexes
- [ ] Can be run after forward migration

**Technical Notes**:
- Standard practice for migrations
- May not be needed if using SQLite (can restore from backup)

---

### TASK-1.2.8: Test Migrations

**Type**: Testing
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.2.6

**Description**:
Test migrations on sample data.

**Acceptance Criteria**:
- [ ] Fresh database: migrations run successfully
- [ ] Existing database: migrations run without data loss
- [ ] Data migration creates correct pen_name records
- [ ] Foreign keys reference correct records
- [ ] Rollback works correctly

**Technical Notes**:
- Create test database with sample projects
- Verify data integrity after migration

---

## Epic 1.3: Pen Names API

**Epic Goal**: Create complete CRUD API for pen names

### TASK-1.3.1: Create Pen Names Route Structure

**Type**: Backend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.2.1

**Description**:
Create the route file structure for pen names API.

**Acceptance Criteria**:
- [ ] Create `backend/src/routes/pen-names/` directory
- [ ] Create `index.ts` with router composition
- [ ] Create `crud.ts` for basic CRUD operations
- [ ] Create `portfolio.ts` for portfolio/stats endpoints
- [ ] Register router in main app
- [ ] Route accessible at `/api/pen-names`

**Technical Notes**:
- Follow projects module structure as template
- Export default router from index.ts

---

### TASK-1.3.2: Implement GET /api/pen-names

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.3.1

**Description**:
Implement endpoint to list all pen names.

**Acceptance Criteria**:
- [ ] Returns array of pen names for current user
- [ ] Excludes soft-deleted records (deleted_at IS NULL)
- [ ] Includes computed fields: book_count, word_count
- [ ] Sorted by is_default DESC, created_at ASC
- [ ] Returns empty array if no pen names exist

**Response Schema**:
```json
{
  "penNames": [
    {
      "id": "uuid",
      "pen_name": "Sarah Blake",
      "display_name": "Sarah Blake",
      "bio": "...",
      "photo": "base64...",
      "website": "...",
      "social_media": {},
      "genres": ["romance"],
      "is_public": true,
      "is_default": true,
      "book_count": 12,
      "word_count": 450000
    }
  ]
}
```

---

### TASK-1.3.3: Implement GET /api/pen-names/:id

**Type**: Backend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.3.1

**Description**:
Implement endpoint to get a single pen name.

**Acceptance Criteria**:
- [ ] Returns pen name by ID
- [ ] Returns 404 if not found or deleted
- [ ] Includes computed fields: book_count, word_count
- [ ] Verifies pen name belongs to current user

---

### TASK-1.3.4: Implement POST /api/pen-names

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.3.1

**Description**:
Implement endpoint to create a pen name.

**Acceptance Criteria**:
- [ ] Creates new pen name record
- [ ] Generates UUID for id
- [ ] Validates required field: pen_name
- [ ] Validates pen_name uniqueness for user
- [ ] If is_default=true, unsets other defaults
- [ ] Returns created pen name with 201 status

**Request Schema**:
```json
{
  "pen_name": "J.R. Thornton",
  "display_name": "J.R. Thornton",
  "bio": "...",
  "website": "...",
  "social_media": {},
  "genres": ["thriller"],
  "is_public": false,
  "is_default": false
}
```

---

### TASK-1.3.5: Implement PUT /api/pen-names/:id

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.3.1

**Description**:
Implement endpoint to update a pen name.

**Acceptance Criteria**:
- [ ] Updates pen name by ID
- [ ] Returns 404 if not found or deleted
- [ ] Validates pen_name uniqueness if changed
- [ ] If is_default=true, unsets other defaults
- [ ] Updates updated_at timestamp
- [ ] Returns updated pen name

---

### TASK-1.3.6: Implement DELETE /api/pen-names/:id

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.3.1

**Description**:
Implement soft delete for pen names.

**Acceptance Criteria**:
- [ ] Sets deleted_at timestamp (soft delete)
- [ ] Returns 404 if not found or already deleted
- [ ] Returns 400 if pen name has assigned books
- [ ] Verifies pen name belongs to current user
- [ ] If was default, no automatic reassignment (user must choose)
- [ ] Returns 204 No Content on success

---

### TASK-1.3.7: Implement POST /api/pen-names/:id/photo

**Type**: Backend
**Points**: 1.5
**Priority**: Medium
**Depends On**: TASK-1.3.1

**Description**:
Implement photo upload for pen names.

**Acceptance Criteria**:
- [ ] Accepts multipart form data with image file
- [ ] Validates file is image (jpeg, png, gif, webp)
- [ ] Validates file size (max 5MB)
- [ ] Converts to base64 and stores in photo field
- [ ] Stores MIME type in photo_type field
- [ ] Returns 404 if pen name not found
- [ ] Returns updated pen name

---

### TASK-1.3.8: Implement PUT /api/pen-names/:id/default

**Type**: Backend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-1.3.1

**Description**:
Implement endpoint to set default pen name.

**Acceptance Criteria**:
- [ ] Sets is_default=true for specified pen name
- [ ] Sets is_default=false for all other pen names
- [ ] Returns 404 if not found
- [ ] Returns updated pen name

---

### TASK-1.3.9: Implement GET /api/pen-names/:id/books

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.3.1

**Description**:
Implement endpoint to get books by pen name.

**Acceptance Criteria**:
- [ ] Returns all books with matching pen_name_id
- [ ] Also returns books from projects with matching pen_name_id
- [ ] Includes: id, title, series_name, status, word_count, genre
- [ ] Supports pagination (page, pageSize params)
- [ ] Returns total count for pagination

**Response Schema**:
```json
{
  "books": [...],
  "total": 12,
  "page": 1,
  "pageSize": 20
}
```

---

### TASK-1.3.10: Implement GET /api/pen-names/:id/stats

**Type**: Backend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-1.3.1

**Description**:
Implement statistics endpoint for pen name.

**Acceptance Criteria**:
- [ ] Returns aggregated statistics
- [ ] book_count: total books
- [ ] series_count: unique series
- [ ] total_words: sum of word counts
- [ ] published_count: books with published status
- [ ] genres: breakdown by genre
- [ ] books_by_year: breakdown by year

**Response Schema**:
```json
{
  "book_count": 12,
  "series_count": 3,
  "total_words": 450000,
  "published_count": 8,
  "genres": {"romance": 8, "contemporary": 4},
  "books_by_year": {"2023": 3, "2024": 5}
}
```

---

### TASK-1.3.11: Add Zod Validation Schemas

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.3.2 through TASK-1.3.10

**Description**:
Add input validation for all pen names endpoints.

**Acceptance Criteria**:
- [ ] Create Zod schema for create pen name
- [ ] Create Zod schema for update pen name
- [ ] Validate pen_name: min 1 char, max 100 chars
- [ ] Validate website: valid URL format if provided
- [ ] Validate social_media: object with string values
- [ ] Validate genres: array of strings
- [ ] Return 400 with validation errors if invalid

---

### TASK-1.3.12: Write Pen Names API Tests

**Type**: Testing
**Points**: 3
**Priority**: High
**Depends On**: TASK-1.3.2 through TASK-1.3.10

**Description**:
Write comprehensive tests for pen names API.

**Acceptance Criteria**:
- [ ] Test: List pen names returns correct data
- [ ] Test: Get single pen name works
- [ ] Test: Create pen name succeeds
- [ ] Test: Create duplicate pen name fails
- [ ] Test: Update pen name succeeds
- [ ] Test: Delete pen name soft deletes
- [ ] Test: Delete pen name with books fails
- [ ] Test: Set default updates all records
- [ ] Test: Photo upload stores correctly
- [ ] Test: Stats return correct calculations
- [ ] All tests pass

---

## Epic 1.4: Basic Pen Names UI

**Epic Goal**: Create basic pen names list page

### TASK-1.4.1: Create Pen Names Page Route

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.3.2

**Description**:
Create the /pen-names page route.

**Acceptance Criteria**:
- [ ] Page accessible at `/pen-names`
- [ ] Page title: "Pen Names"
- [ ] Page uses standard layout
- [ ] Loading state while fetching data

---

### TASK-1.4.2: Create PenNameCard Component

**Type**: Frontend
**Points**: 1.5
**Priority**: High

**Description**:
Create a card component to display a pen name summary.

**Acceptance Criteria**:
- [ ] Displays pen name photo (or placeholder)
- [ ] Displays pen_name prominently
- [ ] Displays genres as tags/badges
- [ ] Displays "X books • Y words" stats
- [ ] Shows "Default" badge if is_default
- [ ] "View" button links to portfolio page
- [ ] "Edit" button links to edit page
- [ ] Card is responsive

**Component**: `app/components/pen-names/PenNameCard.tsx`

---

### TASK-1.4.3: Create PenNamesList Component

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.4.2

**Description**:
Create a component to display list of pen name cards.

**Acceptance Criteria**:
- [ ] Renders grid of PenNameCard components
- [ ] Responsive: 1 column mobile, 2 tablet, 3 desktop
- [ ] Handles empty array gracefully
- [ ] Accepts penNames prop

**Component**: `app/components/pen-names/PenNamesList.tsx`

---

### TASK-1.4.4: Add Create Button and Empty State

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.4.3

**Description**:
Add "Create Pen Name" button and empty state.

**Acceptance Criteria**:
- [ ] "New Pen Name" button in page header
- [ ] Button links to `/pen-names/new`
- [ ] Empty state when no pen names exist
- [ ] Empty state has illustration and CTA button
- [ ] Empty state text: "No pen names yet. Create your first pen name to get started."

---

### TASK-1.4.5: Create usePenNames Hook

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.3.2

**Description**:
Create a custom hook for fetching pen names data.

**Acceptance Criteria**:
- [ ] Fetches from GET /api/pen-names
- [ ] Returns: penNames, isLoading, error, refetch
- [ ] Handles loading state
- [ ] Handles error state
- [ ] Caches data appropriately

**Hook**: `app/hooks/usePenNames.ts`

---

### TASK-1.4.6: Wire Up Pen Names Page

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.4.3, TASK-1.4.5

**Description**:
Connect the pen names page to the API.

**Acceptance Criteria**:
- [ ] Page uses usePenNames hook
- [ ] Shows loading skeleton while loading
- [ ] Shows error message if request fails
- [ ] Renders PenNamesList with data
- [ ] Shows empty state when no data

---

### TASK-1.4.7: Add Pen Names Navigation Link

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-1.4.1

**Description**:
Add pen names link to navigation.

**Acceptance Criteria**:
- [ ] Link in settings sidebar: "Pen Names"
- [ ] Link in main navigation (optional based on design)
- [ ] Active state when on pen names pages
- [ ] Icon: user/person icon

---

# Sprint 2: Pen Name Management

**Goal**: Full pen name CRUD with portfolio view and project integration

**Sprint Duration**: 1 week
**Total Points**: 37

---

## Epic 2.1: Pen Name Forms

### TASK-2.1.1: Create PenNameForm Component

**Type**: Frontend
**Points**: 2
**Priority**: High
**Depends On**: Sprint 1

**Description**:
Create the main form component for creating/editing pen names.

**Acceptance Criteria**:
- [ ] Form component with controlled inputs
- [ ] Accepts optional `penName` prop for edit mode
- [ ] Accepts `onSubmit` callback prop
- [ ] Handles form state internally
- [ ] Shows loading state during submission
- [ ] Displays validation errors

**Component**: `app/components/pen-names/PenNameForm.tsx`

---

### TASK-2.1.2: Add Display Name Field

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-2.1.1

**Description**:
Add display_name field with preview.

**Acceptance Criteria**:
- [ ] Text input for "Display Name"
- [ ] Helper text: "How your name appears in books (e.g., 'Sarah J. Blake')"
- [ ] Live preview showing how name will appear
- [ ] Auto-populate from pen_name if empty

---

### TASK-2.1.3: Add Bio Textarea

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.1.1

**Description**:
Add bio field with markdown support.

**Acceptance Criteria**:
- [ ] Textarea for "Biography"
- [ ] Supports markdown formatting
- [ ] Preview toggle to see rendered markdown
- [ ] No character limit (long-form bio)
- [ ] Placeholder with example bio text

---

### TASK-2.1.4: Add Short Bio Field

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.1.1

**Description**:
Add short bio field with word counter.

**Acceptance Criteria**:
- [ ] Textarea for "Short Bio"
- [ ] Helper text: "50-100 words for query letters and back matter"
- [ ] Live word counter: "X / 100 words"
- [ ] Warning colour when over 100 words
- [ ] Error colour when over 150 words

---

### TASK-2.1.5: Add Website Field

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-2.1.1

**Description**:
Add website URL field with validation.

**Acceptance Criteria**:
- [ ] Text input for "Website"
- [ ] URL validation (must be valid URL)
- [ ] Prepends https:// if missing protocol
- [ ] Shows clickable link preview

---

### TASK-2.1.6: Create SocialMediaEditor Component

**Type**: Frontend
**Points**: 2
**Priority**: Medium

**Description**:
Create component for editing social media links.

**Acceptance Criteria**:
- [ ] Displays common platforms: Twitter/X, Instagram, Facebook, TikTok, Goodreads
- [ ] Each platform has icon and text input
- [ ] Accepts handle or full URL
- [ ] Normalises to handle format for storage
- [ ] "Add custom" option for other platforms
- [ ] Clear button to remove link

**Component**: `app/components/pen-names/SocialMediaEditor.tsx`

---

### TASK-2.1.7: Integrate SocialMediaEditor

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-2.1.1, TASK-2.1.6

**Description**:
Add SocialMediaEditor to the pen name form.

**Acceptance Criteria**:
- [ ] Editor appears in "Social Media" section
- [ ] Values sync with form state
- [ ] Saves as JSON object

---

### TASK-2.1.8: Add Genre Multi-Select

**Type**: Frontend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-2.1.1

**Description**:
Add genre selection for pen name.

**Acceptance Criteria**:
- [ ] Multi-select dropdown for genres
- [ ] Uses existing GENRES constant from lib
- [ ] Displays selected genres as removable tags
- [ ] Maximum 5 genres
- [ ] Helper text: "Genres this pen name writes in"

---

### TASK-2.1.9: Add Public Toggle

**Type**: Frontend
**Points**: 0.5
**Priority**: Low
**Depends On**: TASK-2.1.1

**Description**:
Add is_public toggle with explanation.

**Acceptance Criteria**:
- [ ] Toggle switch for "Public pen name"
- [ ] Helper text: "Public pen names can be linked to your real identity"
- [ ] Default: true (public)

---

### TASK-2.1.10: Add Default Toggle

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-2.1.1

**Description**:
Add is_default toggle.

**Acceptance Criteria**:
- [ ] Toggle switch for "Default pen name"
- [ ] Helper text: "Used automatically for new projects"
- [ ] Warning if changing default: "This will replace X as your default"
- [ ] Disabled if already default

---

### TASK-2.1.11: Create /pen-names/new Page

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.1.1

**Description**:
Create the page for creating new pen names.

**Acceptance Criteria**:
- [ ] Page at `/pen-names/new`
- [ ] Page title: "Create Pen Name"
- [ ] Back button to /pen-names
- [ ] Renders PenNameForm in create mode
- [ ] On submit: calls POST /api/pen-names
- [ ] On success: redirects to /pen-names/[id]
- [ ] On error: shows error message

---

### TASK-2.1.12: Create /pen-names/[id]/edit Page

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.1.1

**Description**:
Create the page for editing pen names.

**Acceptance Criteria**:
- [ ] Page at `/pen-names/[id]/edit`
- [ ] Page title: "Edit [Pen Name]"
- [ ] Back button to /pen-names/[id]
- [ ] Fetches pen name data on mount
- [ ] Renders PenNameForm in edit mode with data
- [ ] On submit: calls PUT /api/pen-names/:id
- [ ] On success: redirects to /pen-names/[id]
- [ ] On error: shows error message

---

### TASK-2.1.13: Add Form Submission Logic

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.1.11, TASK-2.1.12

**Description**:
Implement form submission with API integration.

**Acceptance Criteria**:
- [ ] Submit button shows loading state
- [ ] Form disabled during submission
- [ ] API errors displayed in form
- [ ] Validation errors from API displayed per-field
- [ ] Success triggers redirect

---

### TASK-2.1.14: Add Toast Notifications

**Type**: Frontend
**Points**: 0.5
**Priority**: Low
**Depends On**: TASK-2.1.13

**Description**:
Add success/error toast notifications.

**Acceptance Criteria**:
- [ ] Success toast: "Pen name created" / "Pen name updated"
- [ ] Error toast: "Failed to save pen name"
- [ ] Toasts auto-dismiss after 5 seconds
- [ ] Toasts can be manually dismissed

---

## Epic 2.2: Pen Name Photo Management

### TASK-2.2.1: Create PenNamePhotoUpload Component

**Type**: Frontend
**Points**: 2
**Priority**: High

**Description**:
Create photo upload component for pen names.

**Acceptance Criteria**:
- [ ] Circular photo display area
- [ ] Click to upload trigger
- [ ] Accepts image files only
- [ ] Shows file size validation
- [ ] Handles upload state

**Component**: `app/components/pen-names/PenNamePhotoUpload.tsx`

---

### TASK-2.2.2: Add Image Preview

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.2.1

**Description**:
Add image preview with placeholder.

**Acceptance Criteria**:
- [ ] Shows current photo if exists
- [ ] Shows placeholder icon if no photo
- [ ] Preview updates immediately on file select
- [ ] Circular crop preview

---

### TASK-2.2.3: Add Drag-and-Drop Upload

**Type**: Frontend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-2.2.1

**Description**:
Add drag-and-drop functionality.

**Acceptance Criteria**:
- [ ] Drop zone highlights on drag over
- [ ] Accepts dropped image files
- [ ] Shows error for non-image files
- [ ] Works alongside click-to-upload

---

### TASK-2.2.4: Add Image Cropping Modal

**Type**: Frontend
**Points**: 2
**Priority**: Medium
**Depends On**: TASK-2.2.1

**Description**:
Add modal for cropping uploaded images.

**Acceptance Criteria**:
- [ ] Modal opens after file selection
- [ ] Circular crop area
- [ ] Zoom slider
- [ ] Drag to reposition
- [ ] "Save" and "Cancel" buttons
- [ ] Outputs cropped image

**Technical Notes**:
- Use react-image-crop or similar library

---

### TASK-2.2.5: Integrate Photo Upload with API

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.2.1, TASK-1.3.7

**Description**:
Connect photo upload to API.

**Acceptance Criteria**:
- [ ] Uploads to POST /api/pen-names/:id/photo
- [ ] Shows upload progress
- [ ] Updates display on success
- [ ] Shows error message on failure

---

### TASK-2.2.6: Add Delete Photo Functionality

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-2.2.5

**Description**:
Add ability to delete pen name photo.

**Acceptance Criteria**:
- [ ] Delete button visible when photo exists
- [ ] Confirmation prompt before delete
- [ ] Calls API to remove photo
- [ ] Updates display on success

---

### TASK-2.2.7: Handle Loading and Error States

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-2.2.5

**Description**:
Add proper loading and error handling.

**Acceptance Criteria**:
- [ ] Loading spinner during upload
- [ ] Upload disabled during loading
- [ ] Error message below upload area
- [ ] Retry option on failure

---

## Epic 2.3: Pen Name Portfolio Page

### TASK-2.3.1: Create Portfolio Page Route

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-1.3.3

**Description**:
Create the pen name portfolio page.

**Acceptance Criteria**:
- [ ] Page at `/pen-names/[id]`
- [ ] Fetches pen name data by ID
- [ ] Shows loading state
- [ ] Shows 404 if not found

---

### TASK-2.3.2: Create PenNameHeader Component

**Type**: Frontend
**Points**: 1.5
**Priority**: High

**Description**:
Create header component showing pen name profile.

**Acceptance Criteria**:
- [ ] Large circular photo (or placeholder)
- [ ] Pen name as h1
- [ ] Display name subtitle if different
- [ ] Bio text below name
- [ ] Responsive layout

**Component**: `app/components/pen-names/PenNameHeader.tsx`

---

### TASK-2.3.3: Create PenNameStats Component

**Type**: Frontend
**Points**: 1.5
**Priority**: High
**Depends On**: TASK-1.3.10

**Description**:
Create statistics display component.

**Acceptance Criteria**:
- [ ] Grid of stat cards
- [ ] Total books count
- [ ] Total word count (formatted)
- [ ] Series count
- [ ] Published count
- [ ] Cards have icons

**Component**: `app/components/pen-names/PenNameStats.tsx`

---

### TASK-2.3.4: Create PenNameBooksList Component

**Type**: Frontend
**Points**: 1.5
**Priority**: High
**Depends On**: TASK-1.3.9

**Description**:
Create books list for portfolio page.

**Acceptance Criteria**:
- [ ] Table showing books under this pen name
- [ ] Columns: Title, Series, Status, Words
- [ ] Links to book/project pages
- [ ] Sorted by most recent first
- [ ] Empty state if no books

**Component**: `app/components/pen-names/PenNameBooksList.tsx`

---

### TASK-2.3.5: Add Social Media Links Display

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-2.3.2

**Description**:
Display social media links in header.

**Acceptance Criteria**:
- [ ] Icon buttons for each platform
- [ ] Links open in new tab
- [ ] Tooltip shows platform name
- [ ] Only shows configured platforms

---

### TASK-2.3.6: Add Edit Button

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-2.3.1

**Description**:
Add edit button to portfolio page.

**Acceptance Criteria**:
- [ ] "Edit" button in page header
- [ ] Links to /pen-names/[id]/edit
- [ ] Icon: pencil/edit icon

---

### TASK-2.3.7: Add Export About Author Button

**Type**: Frontend
**Points**: 1
**Priority**: Low
**Depends On**: TASK-2.3.1

**Description**:
Add button to export "About the Author" content.

**Acceptance Criteria**:
- [ ] "Export" dropdown button
- [ ] Options: "Copy to clipboard", "Download as .txt"
- [ ] Exports formatted bio with name
- [ ] Success toast on copy

---

### TASK-2.3.8: Wire Up Portfolio Page

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.3.1 through TASK-2.3.4

**Description**:
Connect all portfolio components with API data.

**Acceptance Criteria**:
- [ ] Fetches pen name, stats, and books
- [ ] Passes data to child components
- [ ] Loading states for each section
- [ ] Error handling

---

## Epic 2.4: Project-Pen Name Integration

### TASK-2.4.1: Create PenNameSelect Component

**Type**: Frontend
**Points**: 1.5
**Priority**: High
**Depends On**: TASK-1.3.2

**Description**:
Create dropdown component for selecting pen names.

**Acceptance Criteria**:
- [ ] Fetches pen names from API
- [ ] Shows pen name with photo thumbnail
- [ ] Indicates default pen name
- [ ] "Create new pen name" option at bottom
- [ ] Searchable if many pen names
- [ ] Controlled component with value/onChange

**Component**: `app/components/pen-names/PenNameSelect.tsx`

---

### TASK-2.4.2: Add Pen Name to Project Creation

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.4.1

**Description**:
Add pen name selection to project creation form.

**Acceptance Criteria**:
- [ ] PenNameSelect in project creation form
- [ ] Default pen name pre-selected
- [ ] Optional (can leave unset)
- [ ] Saves pen_name_id on project

---

### TASK-2.4.3: Add Pen Name to Project Edit

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-2.4.1

**Description**:
Add pen name selection to project edit page.

**Acceptance Criteria**:
- [ ] PenNameSelect in project settings
- [ ] Shows current selection
- [ ] Can change pen name
- [ ] Updates on save

---

### TASK-2.4.4: Update Project API for Pen Name

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-1.2.2

**Description**:
Update project API to handle pen_name_id.

**Acceptance Criteria**:
- [ ] POST /api/projects accepts pen_name_id
- [ ] PUT /api/projects accepts pen_name_id
- [ ] GET /api/projects returns pen_name_id and pen_name details
- [ ] Validates pen_name_id exists

---

### TASK-2.4.5: Migrate Existing Author Names

**Type**: Backend
**Points**: 1.5
**Priority**: Medium
**Depends On**: TASK-2.4.4

**Description**:
Link existing projects to pen names where possible.

**Acceptance Criteria**:
- [ ] Script finds projects with author_name
- [ ] Matches to existing pen_name records
- [ ] Updates pen_name_id on matches
- [ ] Logs unmatched for manual review
- [ ] Non-destructive (keeps author_name field)

---

### TASK-2.4.6: Show Pen Name on Project Cards

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-2.4.4

**Description**:
Display pen name on project list cards.

**Acceptance Criteria**:
- [ ] Pen name shown on project card
- [ ] Shows pen_name from linked record
- [ ] Falls back to author_name text field
- [ ] Subtle styling (secondary text)

---

### TASK-2.4.7: Add Pen Name Filter to Projects

**Type**: Frontend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-2.4.4

**Description**:
Add pen name filter to projects page.

**Acceptance Criteria**:
- [ ] Filter dropdown on projects page
- [ ] Options: All, [each pen name]
- [ ] Filters project list by pen_name_id
- [ ] Updates URL params
- [ ] Persists on page reload

---

# Sprint 3: Book Tracking

**Goal**: Comprehensive book dashboard with metadata and status workflow

**Sprint Duration**: 1.3 weeks
**Total Points**: 53

---

## Epic 3.1: Books Database Extension

### TASK-3.1.1: Create Books Extension Migration

**Type**: Backend
**Points**: 1
**Priority**: High

**Description**:
Create migration to extend books table with publishing metadata.

**Acceptance Criteria**:
- [ ] Migration file with sequential number
- [ ] All ALTER TABLE statements
- [ ] Creates book_platforms table
- [ ] Creates book_status_history table
- [ ] Migration runs successfully

---

### TASK-3.1.2: Add ISBN Column

**Type**: Backend
**Points**: 0.25
**Priority**: High
**Depends On**: TASK-3.1.1

**Description**:
Add ISBN column to books table.

**Acceptance Criteria**:
- [ ] `isbn` TEXT column added
- [ ] Nullable (not all books have ISBN)

---

### TASK-3.1.3: Add Publication Date Column

**Type**: Backend
**Points**: 0.25
**Priority**: High
**Depends On**: TASK-3.1.1

**Description**:
Add publication date column.

**Acceptance Criteria**:
- [ ] `publication_date` TEXT column added
- [ ] Stores ISO date format

---

### TASK-3.1.4: Add Publication Status Column

**Type**: Backend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.1.1

**Description**:
Add publication status enum column.

**Acceptance Criteria**:
- [ ] `publication_status` TEXT column added
- [ ] CHECK constraint for valid values
- [ ] Values: draft, beta_readers, editing, submitted, published
- [ ] Default: 'draft'

---

### TASK-3.1.5: Add Blurb Column

**Type**: Backend
**Points**: 0.25
**Priority**: High
**Depends On**: TASK-3.1.1

**Description**:
Add book blurb/description column.

**Acceptance Criteria**:
- [ ] `blurb` TEXT column added
- [ ] No length limit

---

### TASK-3.1.6: Add Keywords Column

**Type**: Backend
**Points**: 0.25
**Priority**: Medium
**Depends On**: TASK-3.1.1

**Description**:
Add keywords JSON column.

**Acceptance Criteria**:
- [ ] `keywords` TEXT column added
- [ ] Stores JSON array of strings

---

### TASK-3.1.7: Add Cover Image Column

**Type**: Backend
**Points**: 0.25
**Priority**: Medium
**Depends On**: TASK-3.1.1

**Description**:
Add cover image base64 column.

**Acceptance Criteria**:
- [ ] `cover_image` TEXT column added
- [ ] Stores base64 encoded image

---

### TASK-3.1.8: Add Cover Image Type Column

**Type**: Backend
**Points**: 0.25
**Priority**: Medium
**Depends On**: TASK-3.1.1

**Description**:
Add cover image MIME type column.

**Acceptance Criteria**:
- [ ] `cover_image_type` TEXT column added
- [ ] Stores MIME type string

---

### TASK-3.1.9: Create Book Platforms Table

**Type**: Backend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-3.1.1

**Description**:
Create junction table for book platforms.

**Acceptance Criteria**:
- [ ] Table `book_platforms` created
- [ ] Columns: id, book_id, platform, platform_url, status, published_date
- [ ] Foreign key to books
- [ ] Unique constraint on (book_id, platform)

---

### TASK-3.1.10: Add Database Indexes

**Type**: Backend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-3.1.1

**Description**:
Add indexes for book queries.

**Acceptance Criteria**:
- [ ] Index on books(pen_name_id)
- [ ] Index on books(publication_status)
- [ ] Index on book_platforms(book_id)

---

### TASK-3.1.11: Test Books Migration

**Type**: Testing
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.1.1

**Description**:
Test the books extension migration.

**Acceptance Criteria**:
- [ ] Migration runs on fresh database
- [ ] Migration runs on existing database
- [ ] Existing book data preserved
- [ ] New columns have correct defaults

---

## Epic 3.2: Books API Extension

### TASK-3.2.1: Update GET /api/books

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.1.1

**Description**:
Update books GET endpoint to include new fields.

**Acceptance Criteria**:
- [ ] Returns all new columns
- [ ] Returns platforms array
- [ ] Returns pen_name details if linked
- [ ] Backwards compatible

---

### TASK-3.2.2: Update PUT /api/books/:id

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.1.1

**Description**:
Update books PUT endpoint to handle new fields.

**Acceptance Criteria**:
- [ ] Accepts all new fields
- [ ] Validates ISBN format if provided
- [ ] Validates publication_status value
- [ ] Saves keywords as JSON
- [ ] Returns updated book

---

### TASK-3.2.3: Implement GET /api/books/all

**Type**: Backend
**Points**: 1.5
**Priority**: High
**Depends On**: TASK-3.1.1

**Description**:
Create endpoint to list all books across projects.

**Acceptance Criteria**:
- [ ] Returns books from all projects
- [ ] Includes project and series info
- [ ] Includes pen_name info
- [ ] Supports query params for filtering
- [ ] Default sort: updated_at DESC

---

### TASK-3.2.4: Add Filtering Parameters

**Type**: Backend
**Points**: 1.5
**Priority**: High
**Depends On**: TASK-3.2.3

**Description**:
Add filtering support to books/all endpoint.

**Acceptance Criteria**:
- [ ] `pen_name_id` - filter by pen name
- [ ] `publication_status` - filter by status
- [ ] `genre` - filter by genre
- [ ] `series_id` - filter by series
- [ ] `search` - search title and series name
- [ ] Filters can be combined

---

### TASK-3.2.5: Add Sorting Parameters

**Type**: Backend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-3.2.3

**Description**:
Add sorting support to books/all endpoint.

**Acceptance Criteria**:
- [ ] `sort` param: title, publication_status, word_count, publication_date, updated_at
- [ ] `order` param: asc, desc
- [ ] Default: updated_at desc

---

### TASK-3.2.6: Add Pagination

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.2.3

**Description**:
Add pagination to books/all endpoint.

**Acceptance Criteria**:
- [ ] `page` param (default 1)
- [ ] `pageSize` param (default 20, max 100)
- [ ] Response includes: total, page, pageSize, totalPages
- [ ] Efficient query (LIMIT/OFFSET)

---

### TASK-3.2.7: Implement PATCH /api/books/:id/status

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.1.4

**Description**:
Create endpoint for quick status updates.

**Acceptance Criteria**:
- [ ] Accepts `publication_status` in body
- [ ] Validates status value
- [ ] Records change in status history table
- [ ] Returns updated book

---

### TASK-3.2.8: Implement POST /api/books/:id/cover

**Type**: Backend
**Points**: 1.5
**Priority**: Medium
**Depends On**: TASK-3.1.7

**Description**:
Create endpoint for cover image upload.

**Acceptance Criteria**:
- [ ] Accepts multipart form data
- [ ] Validates image file type
- [ ] Validates file size (max 5MB)
- [ ] Stores as base64
- [ ] Returns updated book

---

### TASK-3.2.9: Implement GET /api/books/stats

**Type**: Backend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-3.2.3

**Description**:
Create endpoint for dashboard statistics.

**Acceptance Criteria**:
- [ ] total_books count
- [ ] total_words sum
- [ ] by_status breakdown
- [ ] by_genre breakdown
- [ ] by_pen_name breakdown
- [ ] Respects same filters as books/all

---

### TASK-3.2.10: Add Zod Validation

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.2.1 through TASK-3.2.8

**Description**:
Add validation schemas for books endpoints.

**Acceptance Criteria**:
- [ ] Schema for book update
- [ ] Schema for status update
- [ ] ISBN format validation
- [ ] Keywords array validation
- [ ] Return 400 with errors

---

### TASK-3.2.11: Write Books API Tests

**Type**: Testing
**Points**: 2
**Priority**: High
**Depends On**: TASK-3.2.1 through TASK-3.2.9

**Description**:
Write tests for extended books API.

**Acceptance Criteria**:
- [ ] Test books/all returns all books
- [ ] Test filtering works correctly
- [ ] Test sorting works correctly
- [ ] Test pagination works correctly
- [ ] Test status update records history
- [ ] Test cover upload stores correctly
- [ ] Test stats calculations correct

---

## Epic 3.3: Books Dashboard Page

### TASK-3.3.1: Create Books Page Route

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.2.3

**Description**:
Create the /books dashboard page.

**Acceptance Criteria**:
- [ ] Page at `/books`
- [ ] Page title: "Books"
- [ ] Standard layout
- [ ] Loading state

---

### TASK-3.3.2: Create BooksDashboardStats Component

**Type**: Frontend
**Points**: 1.5
**Priority**: High
**Depends On**: TASK-3.2.9

**Description**:
Create statistics header component.

**Acceptance Criteria**:
- [ ] Grid of stat cards
- [ ] Total books
- [ ] Total words (formatted: 680K)
- [ ] Published count
- [ ] In Progress count
- [ ] Updates with filters

**Component**: `app/components/books/BooksDashboardStats.tsx`

---

### TASK-3.3.3: Create BooksTable Component

**Type**: Frontend
**Points**: 2
**Priority**: High

**Description**:
Create the main books data table.

**Acceptance Criteria**:
- [ ] Table with columns: checkbox, Title, Pen Name, Series, Status, Words, Actions
- [ ] Row click navigates to book
- [ ] Checkbox for bulk selection
- [ ] Responsive (horizontal scroll on mobile)
- [ ] Empty state

**Component**: `app/components/books/BooksTable.tsx`

---

### TASK-3.3.4: Add Sortable Column Headers

**Type**: Frontend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-3.3.3

**Description**:
Make table columns sortable.

**Acceptance Criteria**:
- [ ] Click header to sort
- [ ] Sort indicator (arrow)
- [ ] Toggle asc/desc on click
- [ ] Updates API query

---

### TASK-3.3.5: Create BooksFilters Component

**Type**: Frontend
**Points**: 2
**Priority**: High

**Description**:
Create filters bar component.

**Acceptance Criteria**:
- [ ] Horizontal bar above table
- [ ] Responsive (stacks on mobile)
- [ ] Clear all filters button
- [ ] Active filter count badge

**Component**: `app/components/books/BooksFilters.tsx`

---

### TASK-3.3.6: Add Pen Name Filter

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.3.5

**Description**:
Add pen name dropdown filter.

**Acceptance Criteria**:
- [ ] Dropdown with all pen names
- [ ] "All Pen Names" option
- [ ] Updates table on change

---

### TASK-3.3.7: Add Status Filter

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.3.5

**Description**:
Add publication status filter.

**Acceptance Criteria**:
- [ ] Dropdown with all statuses
- [ ] "All Statuses" option
- [ ] Multi-select capability

---

### TASK-3.3.8: Add Genre Filter

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-3.3.5

**Description**:
Add genre filter dropdown.

**Acceptance Criteria**:
- [ ] Dropdown with genres
- [ ] "All Genres" option
- [ ] Uses GENRES constant

---

### TASK-3.3.9: Add Date Range Filter

**Type**: Frontend
**Points**: 1
**Priority**: Low
**Depends On**: TASK-3.3.5

**Description**:
Add date range filter for publication date.

**Acceptance Criteria**:
- [ ] Date picker for start/end
- [ ] Presets: Last 30 days, This year, Last year
- [ ] Clear button

---

### TASK-3.3.10: Add Search Input

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.3.5

**Description**:
Add search box for title/series.

**Acceptance Criteria**:
- [ ] Text input with search icon
- [ ] Placeholder: "Search books..."
- [ ] Debounced search (300ms)
- [ ] Clear button when has value

---

### TASK-3.3.11: Create useBooksData Hook

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.2.3

**Description**:
Create hook for fetching books data.

**Acceptance Criteria**:
- [ ] Fetches from /api/books/all
- [ ] Accepts filter/sort params
- [ ] Returns: books, stats, isLoading, error
- [ ] Refetch function
- [ ] Pagination state

**Hook**: `app/hooks/useBooksData.ts`

---

### TASK-3.3.12: Wire Up Books Dashboard

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.3.1 through TASK-3.3.11

**Description**:
Connect all dashboard components.

**Acceptance Criteria**:
- [ ] Filters update URL params
- [ ] URL params restore filters on load
- [ ] Table updates on filter change
- [ ] Stats update with filters

---

### TASK-3.3.13: Add Pagination Controls

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.2.6

**Description**:
Add pagination UI below table.

**Acceptance Criteria**:
- [ ] Previous/Next buttons
- [ ] Page number display
- [ ] Total items display
- [ ] Items per page selector

---

### TASK-3.3.14: Add Empty State

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-3.3.3

**Description**:
Add empty state when no books.

**Acceptance Criteria**:
- [ ] Illustration
- [ ] "No books found" message
- [ ] Different message if filters active
- [ ] "Clear filters" button if filtered

---

### TASK-3.3.15: Add Books Navigation Link

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.3.1

**Description**:
Add books link to main navigation.

**Acceptance Criteria**:
- [ ] Link in main navigation
- [ ] Icon: book icon
- [ ] Active state when on /books

---

## Epic 3.4: Book Detail/Edit Page

### TASK-3.4.1: Create Book Detail Page

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.2.1

**Description**:
Create the /books/[id] page.

**Acceptance Criteria**:
- [ ] Page at `/books/[id]`
- [ ] Fetches book data
- [ ] Loading state
- [ ] 404 if not found
- [ ] Back button to /books

---

### TASK-3.4.2: Create BookHeader Component

**Type**: Frontend
**Points**: 1
**Priority**: High

**Description**:
Create header showing book info.

**Acceptance Criteria**:
- [ ] Cover image (or placeholder)
- [ ] Title as h1
- [ ] Series name if applicable
- [ ] Pen name
- [ ] Word count
- [ ] Status badge

**Component**: `app/components/books/BookHeader.tsx`

---

### TASK-3.4.3: Create BookMetadataForm Component

**Type**: Frontend
**Points**: 2
**Priority**: High

**Description**:
Create form for editing book metadata.

**Acceptance Criteria**:
- [ ] Form with all metadata fields
- [ ] Sections: Publishing, Description, Keywords
- [ ] Save button
- [ ] Cancel button (resets changes)

**Component**: `app/components/books/BookMetadataForm.tsx`

---

### TASK-3.4.4: Add ISBN Field

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-3.4.3

**Description**:
Add ISBN input field.

**Acceptance Criteria**:
- [ ] Text input for ISBN
- [ ] Format validation (ISBN-10 or ISBN-13)
- [ ] Helper text with format example
- [ ] Auto-format as user types

---

### TASK-3.4.5: Add Publication Date Picker

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.4.3

**Description**:
Add publication date field.

**Acceptance Criteria**:
- [ ] Date picker component
- [ ] Can select future dates (pre-orders)
- [ ] Clear button
- [ ] Shows "Not published" if empty

---

### TASK-3.4.6: Add Publication Status Select

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.4.3

**Description**:
Add status dropdown.

**Acceptance Criteria**:
- [ ] Dropdown with status options
- [ ] Coloured status badges in options
- [ ] Confirms before changing from Published

---

### TASK-3.4.7: Add Blurb Textarea

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.4.3

**Description**:
Add book description field.

**Acceptance Criteria**:
- [ ] Large textarea for blurb
- [ ] Character counter
- [ ] Markdown preview toggle
- [ ] Helper text: "Book description for retailers"

---

### TASK-3.4.8: Create KeywordsEditor Component

**Type**: Frontend
**Points**: 1.5
**Priority**: Medium

**Description**:
Create component for managing keywords.

**Acceptance Criteria**:
- [ ] Tag-style input
- [ ] Type and press Enter to add
- [ ] Click X to remove
- [ ] Maximum 7 keywords
- [ ] Drag to reorder

**Component**: `app/components/books/KeywordsEditor.tsx`

---

### TASK-3.4.9: Create PlatformsChecklist Component

**Type**: Frontend
**Points**: 1
**Priority**: Medium

**Description**:
Create checklist for publishing platforms.

**Acceptance Criteria**:
- [ ] Checkboxes for: Amazon KDP, Apple Books, Kobo, Google Play, Barnes & Noble, Smashwords, Draft2Digital, IngramSpark
- [ ] Optional URL field per platform
- [ ] "Other" option with custom name

**Component**: `app/components/books/PlatformsChecklist.tsx`

---

### TASK-3.4.10: Create BookCoverUpload Component

**Type**: Frontend
**Points**: 2
**Priority**: Medium
**Depends On**: TASK-3.2.8

**Description**:
Create cover image upload component.

**Acceptance Criteria**:
- [ ] Book-shaped preview area (6:9 ratio)
- [ ] Click or drag to upload
- [ ] File size validation
- [ ] Crop/resize modal
- [ ] Delete button

**Component**: `app/components/books/BookCoverUpload.tsx`

---

### TASK-3.4.11: Add Form Submission

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.4.3 through TASK-3.4.10

**Description**:
Implement form submission.

**Acceptance Criteria**:
- [ ] Save button calls PUT API
- [ ] Loading state during save
- [ ] Success redirects to book page
- [ ] Error displays inline

---

### TASK-3.4.12: Add Success/Error Handling

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-3.4.11

**Description**:
Add toast notifications.

**Acceptance Criteria**:
- [ ] Success toast on save
- [ ] Error toast on failure
- [ ] Validation errors shown inline

---

## Epic 3.5: Status Workflow

### TASK-3.5.1: Create StatusPipeline Component

**Type**: Frontend
**Points**: 2
**Priority**: High

**Description**:
Create visual status pipeline.

**Acceptance Criteria**:
- [ ] Horizontal pipeline showing all statuses
- [ ] Current status highlighted
- [ ] Completed statuses marked
- [ ] Click status to change

**Component**: `app/components/books/StatusPipeline.tsx`

---

### TASK-3.5.2: Add Status Badges

**Type**: Frontend
**Points**: 1
**Priority**: High

**Description**:
Create status badge component.

**Acceptance Criteria**:
- [ ] Coloured badges per status
- [ ] Draft: Blue
- [ ] Beta Readers: Purple
- [ ] Editing: Yellow
- [ ] Submitted: Orange
- [ ] Published: Green

**Component**: `app/components/books/StatusBadge.tsx`

---

### TASK-3.5.3: Add Status Change Modal

**Type**: Frontend
**Points**: 1
**Priority**: High
**Depends On**: TASK-3.5.1

**Description**:
Create confirmation modal for status changes.

**Acceptance Criteria**:
- [ ] Shows current and new status
- [ ] Optional notes field
- [ ] Confirm/Cancel buttons
- [ ] Warning for downgrading status

---

### TASK-3.5.4: Create Status History Component

**Type**: Frontend
**Points**: 1.5
**Priority**: Medium

**Description**:
Show status change history.

**Acceptance Criteria**:
- [ ] Timeline of status changes
- [ ] Shows: date, old status, new status, notes
- [ ] Most recent first
- [ ] Collapsible section

**Component**: `app/components/books/StatusHistory.tsx`

---

### TASK-3.5.5: Add Bulk Status Update

**Type**: Frontend
**Points**: 2
**Priority**: Medium
**Depends On**: TASK-3.3.3

**Description**:
Allow bulk status updates from dashboard.

**Acceptance Criteria**:
- [ ] Select multiple books via checkboxes
- [ ] "Update Status" button appears
- [ ] Modal to select new status
- [ ] Confirmation before applying
- [ ] Progress indicator for batch

---

### TASK-3.5.6: Add Status History Table

**Type**: Backend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-3.1.1

**Description**:
Create status history logging.

**Acceptance Criteria**:
- [ ] `book_status_history` table
- [ ] Records: book_id, old_status, new_status, changed_at, notes
- [ ] Auto-logged on status change
- [ ] API endpoint to retrieve history

---

### TASK-3.5.7: Display Status on Book Cards

**Type**: Frontend
**Points**: 0.5
**Priority**: High
**Depends On**: TASK-3.5.2

**Description**:
Show status badge on book cards everywhere.

**Acceptance Criteria**:
- [ ] Status badge on dashboard table rows
- [ ] Status badge on project book lists
- [ ] Status badge on pen name portfolio
- [ ] Consistent styling

---

# Sprint 4: Integration & Polish

**Goal**: Connect everything together, add analytics, polish UI

**Sprint Duration**: 1.2 weeks
**Total Points**: 48

---

## Epic 4.1: Export Integration

### TASK-4.1.1: Update Export Service for Pen Names

**Type**: Backend
**Points**: 1.5
**Priority**: High
**Depends On**: Phase 2

**Description**:
Update export service to use pen name profiles.

**Acceptance Criteria**:
- [ ] Export looks up pen_name_id on book/project
- [ ] Falls back to author_name text if no pen_name_id
- [ ] Pen name bio used in "About the Author"

---

### TASK-4.1.2: Add Pen Name Bio to Exports

**Type**: Backend
**Points**: 1
**Priority**: High
**Depends On**: TASK-4.1.1

**Description**:
Include pen name bio in book exports.

**Acceptance Criteria**:
- [ ] "About the Author" section uses pen name bio
- [ ] Falls back to author_profile bio
- [ ] Formatting preserved

---

### TASK-4.1.3: Add Pen Name Photo to Exports

**Type**: Backend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-4.1.1

**Description**:
Include pen name photo in exports.

**Acceptance Criteria**:
- [ ] Author photo in "About the Author"
- [ ] Uses pen name photo if available
- [ ] Falls back to author_profile photo
- [ ] Proper sizing/formatting

---

### TASK-4.1.4: Add Pen Name Links to Back Matter

**Type**: Backend
**Points**: 1
**Priority**: Low
**Depends On**: TASK-4.1.1

**Description**:
Include pen name website and social links.

**Acceptance Criteria**:
- [ ] Website link in back matter
- [ ] Social media handles listed
- [ ] Formatted appropriately for ebook/print

---

### TASK-4.1.5: Create Pen Name Portfolio Export

**Type**: Feature
**Points**: 2
**Priority**: Low
**Depends On**: Epic 2.3

**Description**:
Add ability to export pen name portfolio as PDF.

**Acceptance Criteria**:
- [ ] Export button on portfolio page
- [ ] Generates PDF with:
  - Pen name profile
  - Bio
  - Book list
  - Contact info (optional)
- [ ] Download as PDF

---

### TASK-4.1.6: Test Exports with Multiple Pen Names

**Type**: Testing
**Points**: 1
**Priority**: High
**Depends On**: TASK-4.1.1 through TASK-4.1.5

**Description**:
Test export functionality with pen names.

**Acceptance Criteria**:
- [ ] Export book with pen name - correct bio/photo
- [ ] Export book without pen name - uses fallback
- [ ] Export series with pen name - consistent across books
- [ ] Portfolio export works correctly

---

## Epic 4.2: Series Integration

### TASK-4.2.1: Add Pen Name to Series Table

**Type**: Backend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-1.2.1

**Description**:
Add pen_name_id to series table.

**Acceptance Criteria**:
- [ ] Migration adds pen_name_id column
- [ ] Foreign key to pen_names table
- [ ] Index on pen_name_id

---

### TASK-4.2.2: Add Pen Name to Series Creation

**Type**: Frontend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-4.2.1

**Description**:
Add pen name select to series creation form.

**Acceptance Criteria**:
- [ ] PenNameSelect in series form
- [ ] Default pen name pre-selected
- [ ] Saves to series.pen_name_id

---

### TASK-4.2.3: Display Pen Name on Series Page

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium
**Depends On**: TASK-4.2.1

**Description**:
Show pen name on series detail page.

**Acceptance Criteria**:
- [ ] Pen name displayed in series header
- [ ] Links to pen name portfolio

---

### TASK-4.2.4: Auto-Inherit Pen Name for Books

**Type**: Backend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-4.2.1

**Description**:
New books in series inherit pen name.

**Acceptance Criteria**:
- [ ] Creating book in series sets pen_name_id
- [ ] Inherits from series if series has pen_name_id
- [ ] Inherits from project if no series pen_name
- [ ] Can override at book level

---

### TASK-4.2.5: Validate Pen Name Consistency

**Type**: Backend
**Points**: 1
**Priority**: Low
**Depends On**: TASK-4.2.4

**Description**:
Warn if books in series have different pen names.

**Acceptance Criteria**:
- [ ] API checks pen name consistency
- [ ] Returns warning if mixed pen names
- [ ] UI displays warning on series page
- [ ] Can be dismissed/ignored

---

## Epic 4.3: Analytics & Statistics

### TASK-4.3.1: Create Analytics Page

**Type**: Frontend
**Points**: 0.5
**Priority**: Medium

**Description**:
Create the /analytics page.

**Acceptance Criteria**:
- [ ] Page at `/analytics`
- [ ] Page title: "Analytics"
- [ ] Standard layout

---

### TASK-4.3.2: Create PortfolioStats Component

**Type**: Frontend
**Points**: 1.5
**Priority**: Medium

**Description**:
Create overview statistics component.

**Acceptance Criteria**:
- [ ] Total books written
- [ ] Total words written
- [ ] Books published
- [ ] Active pen names
- [ ] Large stat cards

**Component**: `app/components/analytics/PortfolioStats.tsx`

---

### TASK-4.3.3: Add Books by Pen Name Chart

**Type**: Frontend
**Points**: 1.5
**Priority**: Medium
**Depends On**: TASK-4.3.2

**Description**:
Create pie/bar chart of books by pen name.

**Acceptance Criteria**:
- [ ] Chart showing book count per pen name
- [ ] Interactive (hover for details)
- [ ] Click to filter dashboard
- [ ] Legend with pen name names

---

### TASK-4.3.4: Add Books by Genre Chart

**Type**: Frontend
**Points**: 1.5
**Priority**: Medium
**Depends On**: TASK-4.3.2

**Description**:
Create chart of books by genre.

**Acceptance Criteria**:
- [ ] Bar chart of genres
- [ ] Sorted by count
- [ ] Genre colours

---

### TASK-4.3.5: Add Books by Status Chart

**Type**: Frontend
**Points**: 1
**Priority**: Medium
**Depends On**: TASK-4.3.2

**Description**:
Create chart of books by publication status.

**Acceptance Criteria**:
- [ ] Donut chart of statuses
- [ ] Status colours match badges
- [ ] Shows percentages

---

### TASK-4.3.6: Add Words by Year Chart

**Type**: Frontend
**Points**: 1.5
**Priority**: Medium
**Depends On**: TASK-4.3.2

**Description**:
Create chart of words written by year.

**Acceptance Criteria**:
- [ ] Line or bar chart
- [ ] X-axis: years
- [ ] Y-axis: word count
- [ ] Trend line optional

---

### TASK-4.3.7: Add Publication Timeline

**Type**: Frontend
**Points**: 2
**Priority**: Low
**Depends On**: TASK-4.3.2

**Description**:
Create timeline of published books.

**Acceptance Criteria**:
- [ ] Horizontal timeline
- [ ] Books plotted by publication date
- [ ] Hover for book details
- [ ] Click to navigate to book

---

### TASK-4.3.8: Create Analytics API Endpoints

**Type**: Backend
**Points**: 2
**Priority**: Medium
**Depends On**: TASK-4.3.2 through TASK-4.3.7

**Description**:
Create API endpoints for analytics data.

**Acceptance Criteria**:
- [ ] GET /api/analytics/overview
- [ ] GET /api/analytics/by-pen-name
- [ ] GET /api/analytics/by-genre
- [ ] GET /api/analytics/by-status
- [ ] GET /api/analytics/by-year
- [ ] GET /api/analytics/timeline

---

## Epic 4.4: UI Polish & UX

### TASK-4.4.1: Add Loading Skeletons

**Type**: Frontend
**Points**: 2
**Priority**: Medium

**Description**:
Add loading skeletons to all new pages.

**Acceptance Criteria**:
- [ ] Pen names list skeleton
- [ ] Pen name portfolio skeleton
- [ ] Books dashboard skeleton
- [ ] Book detail skeleton
- [ ] Analytics skeleton

---

### TASK-4.4.2: Add Error Boundaries

**Type**: Frontend
**Points**: 1
**Priority**: High

**Description**:
Add error boundaries to new pages.

**Acceptance Criteria**:
- [ ] Error boundary wraps each page
- [ ] Shows friendly error message
- [ ] "Try again" button
- [ ] Logs error for debugging

---

### TASK-4.4.3: Add Keyboard Shortcuts

**Type**: Frontend
**Points**: 1
**Priority**: Low

**Description**:
Add keyboard shortcuts for common actions.

**Acceptance Criteria**:
- [ ] `n` - New pen name / new book (context aware)
- [ ] `e` - Edit current item
- [ ] `/` - Focus search
- [ ] `?` - Show shortcuts help

---

### TASK-4.4.4: Add Responsive Design

**Type**: Frontend
**Points**: 2
**Priority**: High

**Description**:
Ensure all new pages work on mobile.

**Acceptance Criteria**:
- [ ] Pen names list responsive
- [ ] Books dashboard responsive (table scrolls)
- [ ] Forms work on mobile
- [ ] Touch-friendly buttons

---

### TASK-4.4.5: Add Dark Mode Support

**Type**: Frontend
**Points**: 1
**Priority**: Medium

**Description**:
Ensure new components support dark mode.

**Acceptance Criteria**:
- [ ] All new components have dark mode styles
- [ ] Charts have dark mode colours
- [ ] Forms readable in dark mode
- [ ] No hard-coded colours

---

### TASK-4.4.6: Add Help Tooltips

**Type**: Frontend
**Points**: 1
**Priority**: Low

**Description**:
Add tooltips explaining features.

**Acceptance Criteria**:
- [ ] Info icons with tooltips on complex fields
- [ ] Tooltips accessible (keyboard)
- [ ] UK spelling in all text

---

### TASK-4.4.7: Add Onboarding Flow

**Type**: Frontend
**Points**: 2
**Priority**: Medium

**Description**:
Create onboarding for first pen name.

**Acceptance Criteria**:
- [ ] Detects first-time user
- [ ] Prompts to create first pen name
- [ ] Guided form with explanations
- [ ] Can skip for later

---

### TASK-4.4.8: Performance Optimisation

**Type**: Frontend
**Points**: 1.5
**Priority**: Medium

**Description**:
Optimise performance of new features.

**Acceptance Criteria**:
- [ ] Lazy load pen name photos
- [ ] Virtualise long book lists
- [ ] Memoize expensive calculations
- [ ] Bundle size reasonable

---

## Epic 4.5: Testing & Documentation

### TASK-4.5.1: Write E2E Tests - Pen Names

**Type**: Testing
**Points**: 3
**Priority**: High
**Depends On**: Phase 2

**Description**:
Write end-to-end tests for pen name management.

**Acceptance Criteria**:
- [ ] Test: Create pen name flow
- [ ] Test: Edit pen name flow
- [ ] Test: Delete pen name flow
- [ ] Test: Upload photo flow
- [ ] Test: Set default pen name
- [ ] All tests pass in CI

---

### TASK-4.5.2: Write E2E Tests - Books Dashboard

**Type**: Testing
**Points**: 3
**Priority**: High
**Depends On**: Phase 3

**Description**:
Write end-to-end tests for books dashboard.

**Acceptance Criteria**:
- [ ] Test: View all books
- [ ] Test: Filter by pen name
- [ ] Test: Filter by status
- [ ] Test: Search books
- [ ] Test: Change book status
- [ ] All tests pass in CI

---

### TASK-4.5.3: Write Component Unit Tests

**Type**: Testing
**Points**: 3
**Priority**: Medium
**Depends On**: Phases 2-4

**Description**:
Write unit tests for new components.

**Acceptance Criteria**:
- [ ] Test PenNameCard renders correctly
- [ ] Test PenNameForm validation
- [ ] Test BooksTable sorting
- [ ] Test BooksFilters state
- [ ] Test StatusBadge colours
- [ ] 80%+ coverage on new components

---

### TASK-4.5.4: Update API Documentation

**Type**: Documentation
**Points**: 2
**Priority**: Medium
**Depends On**: All APIs

**Description**:
Document all new API endpoints.

**Acceptance Criteria**:
- [ ] Document pen names endpoints
- [ ] Document books extensions
- [ ] Document analytics endpoints
- [ ] Include request/response examples
- [ ] Document error responses

---

### TASK-4.5.5: Create Pen Names User Guide

**Type**: Documentation
**Points**: 1.5
**Priority**: Low

**Description**:
Write user guide for pen names feature.

**Acceptance Criteria**:
- [ ] Explains why use pen names
- [ ] How to create pen name
- [ ] How to assign to projects
- [ ] How to manage portfolio
- [ ] Screenshots included

---

### TASK-4.5.6: Create Book Tracking User Guide

**Type**: Documentation
**Points**: 1.5
**Priority**: Low

**Description**:
Write user guide for book tracking.

**Acceptance Criteria**:
- [ ] Explains book dashboard
- [ ] How to use filters
- [ ] How to update status
- [ ] How to add metadata
- [ ] Screenshots included

---

# Appendix: Quick Reference

## New Files to Create

```
backend/src/
├── routes/
│   └── pen-names/
│       ├── index.ts
│       ├── crud.ts
│       ├── portfolio.ts
│       └── utils.ts
├── db/
│   └── migrations/
│       ├── 0XX-pen-names.sql
│       └── 0XX-books-publishing.sql

app/
├── pen-names/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/
│       ├── page.tsx
│       └── edit/page.tsx
├── books/
│   ├── page.tsx
│   └── [id]/page.tsx
├── analytics/
│   └── page.tsx
├── components/
│   ├── pen-names/
│   │   ├── PenNameCard.tsx
│   │   ├── PenNameForm.tsx
│   │   ├── PenNameSelect.tsx
│   │   ├── PenNamePhotoUpload.tsx
│   │   ├── PenNameHeader.tsx
│   │   ├── PenNameStats.tsx
│   │   ├── PenNameBooksList.tsx
│   │   └── SocialMediaEditor.tsx
│   ├── books/
│   │   ├── BooksTable.tsx
│   │   ├── BooksFilters.tsx
│   │   ├── BooksDashboardStats.tsx
│   │   ├── BookHeader.tsx
│   │   ├── BookMetadataForm.tsx
│   │   ├── BookCoverUpload.tsx
│   │   ├── KeywordsEditor.tsx
│   │   ├── PlatformsChecklist.tsx
│   │   ├── StatusPipeline.tsx
│   │   ├── StatusBadge.tsx
│   │   └── StatusHistory.tsx
│   └── analytics/
│       └── PortfolioStats.tsx
├── hooks/
│   ├── usePenNames.ts
│   └── useBooksData.ts
└── lib/
    └── book-data/
        ├── index.ts
        ├── publication-statuses.ts
        └── platforms.ts
```

## Database Changes Summary

### New Tables
- `pen_names` - Multiple pen name profiles
- `pen_name_genres` - Pen name genre associations
- `book_platforms` - Book publishing platforms
- `book_status_history` - Status change audit log

### Table Modifications
- `projects` + `pen_name_id`
- `books` + `pen_name_id`, `isbn`, `publication_date`, `publication_status`, `blurb`, `keywords`, `cover_image`, `cover_image_type`
- `series` + `pen_name_id`

## API Endpoints Summary

### Pen Names
- `GET /api/pen-names` - List all
- `GET /api/pen-names/:id` - Get one
- `POST /api/pen-names` - Create
- `PUT /api/pen-names/:id` - Update
- `DELETE /api/pen-names/:id` - Delete
- `POST /api/pen-names/:id/photo` - Upload photo
- `PUT /api/pen-names/:id/default` - Set default
- `GET /api/pen-names/:id/books` - Get books
- `GET /api/pen-names/:id/stats` - Get statistics

### Books (Extended)
- `GET /api/books/all` - List all with filters
- `GET /api/books/stats` - Dashboard statistics
- `PATCH /api/books/:id/status` - Update status
- `POST /api/books/:id/cover` - Upload cover

### Analytics
- `GET /api/analytics/overview`
- `GET /api/analytics/by-pen-name`
- `GET /api/analytics/by-genre`
- `GET /api/analytics/by-status`
- `GET /api/analytics/by-year`
- `GET /api/analytics/timeline`
