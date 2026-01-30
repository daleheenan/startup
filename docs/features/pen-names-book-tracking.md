# Pen Names & Book Tracking - Feature Specification

**Version**: 1.0
**Created**: 2025-01-30
**Status**: Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Feature Requirements](#feature-requirements)
4. [Technical Design](#technical-design)
5. [Implementation Plan](#implementation-plan)
6. [Task Breakdown](#task-breakdown)
7. [UI/UX Specifications](#uiux-specifications)
8. [API Specifications](#api-specifications)
9. [Database Schema](#database-schema)
10. [Testing Requirements](#testing-requirements)
11. [Success Metrics](#success-metrics)

---

## Executive Summary

### Purpose

Enable authors to comprehensively manage multiple pen names and track all their books across series, genres, and publication platforms. This feature transforms NovelForge from a project-based writing tool into a complete author portfolio management system.

### Business Value

- **Author productivity**: Centralised management of writing identities
- **Professional publishing**: Proper metadata for each pen name and book
- **Portfolio visibility**: Dashboard showing all books, filtered by pen name
- **Publication tracking**: Monitor book status from draft to published

### Scope

| In Scope | Out of Scope |
|----------|--------------|
| Multiple pen name management | Sales/royalty tracking (future phase) |
| Per-book metadata & tracking | Platform API integrations (KDP, etc.) |
| Books dashboard with filters | Cover design tools |
| Author profile UI completion | Marketing automation |
| Pen name portfolio views | ISBN purchasing |

---

## Current State Analysis

### Existing Infrastructure

#### Database Fields (Partially Implemented)

```
author_profile table:
├── author_name       ✅ Exists, ❌ Not in UI
├── pen_name          ✅ Exists, ❌ Not in UI
├── author_bio        ✅ Exists, ✅ In UI
├── author_bio_short  ✅ Exists, ❌ Not in UI
├── author_photo      ✅ Exists, ✅ In UI
├── contact_*         ✅ Exists, ❌ Not in UI
├── writing_credentials ✅ Exists, ❌ Not in UI
└── preferred_pronouns  ✅ Exists, ❌ Not in UI

projects table:
├── author_name       ✅ Exists, ✅ In UI (per-project pen name)
└── (publishing fields) ✅ Exists, ✅ In UI

books table:
├── title, status, word_count ✅ Complete
├── pen_name_id       ❌ Missing
├── isbn              ❌ Missing
├── publication_date  ❌ Missing
└── blurb/keywords    ❌ Missing
```

#### API Endpoints (Partially Implemented)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET/PUT /api/author-profile` | ✅ Works | Doesn't expose all fields |
| `GET/POST /api/projects` | ✅ Works | Has author_name field |
| `GET/POST /api/books` | ✅ Works | Missing publishing metadata |
| `/api/pen-names/*` | ❌ Missing | Needs full implementation |

#### Frontend Pages (Gaps Identified)

| Page | Status | Issues |
|------|--------|--------|
| `/settings/author-profile` | ⚠️ Partial | Missing 8+ fields from schema |
| `/projects/[id]` | ✅ Works | Has author_name |
| `/books` | ❌ Missing | No all-books dashboard |
| `/pen-names` | ❌ Missing | No pen name management |

### Gap Summary

1. **Single pen name only** - Schema supports one, authors need many
2. **UI incomplete** - Author profile page shows 4 of 12+ fields
3. **No portfolio view** - Cannot see all books by pen name
4. **Missing book metadata** - ISBN, publication date, platforms not tracked

---

## Feature Requirements

### FR1: Multiple Pen Name Management

#### FR1.1: Create Pen Names
- Users can create unlimited pen names
- Each pen name has: display name, bio, photo, website, social links
- One pen name can be marked as default
- Pen names can be marked as public (linked to real identity) or private

#### FR1.2: Edit Pen Names
- All pen name fields are editable
- Photo upload with crop/resize
- Social media links with platform icons
- Genre associations for organisation

#### FR1.3: Delete Pen Names
- Soft delete with confirmation
- Must reassign books before deletion
- Cannot delete pen name with assigned books

#### FR1.4: Pen Name Portfolio View
- Dedicated page per pen name showing all books
- Statistics: total books, word count, genres
- Export "About the Author" content

### FR2: Comprehensive Book Tracking

#### FR2.1: Books Dashboard
- List all books across all projects/series
- Columns: Title, Series, Pen Name, Genre, Status, Word Count, Published Date
- Filters: Pen name, genre, status, series, date range
- Sort: By any column
- Search: Title, series name

#### FR2.2: Per-Book Metadata
- ISBN (manual entry)
- Publication date
- Publication status: Draft → Beta Readers → Editor → Submitted → Published
- Blurb/description
- Keywords/tags
- Cover image
- Platforms published on (checkbox list)

#### FR2.3: Book Status Workflow
- Visual status pipeline
- Bulk status updates
- Status change history/audit log

### FR3: Author Profile Completion

#### FR3.1: Expose All Existing Fields
- Author name (legal name for contracts)
- Pen name (primary/default)
- Short bio (for query letters)
- Contact information (address, phone, email)
- Writing credentials (publications, awards)
- Preferred pronouns

#### FR3.2: Profile Sections
- Personal Information section
- Contact Information section
- Writing Credentials section
- Social Media section

### FR4: Integration Points

#### FR4.1: Project Integration
- Projects link to pen names (not just text field)
- Pen name dropdown on project creation/edit
- Inherit pen name defaults when creating books

#### FR4.2: Export Integration
- Use pen name profile for "About the Author" sections
- Use correct pen name bio/photo per book
- Export pen name portfolio as PDF/webpage

#### FR4.3: Series Integration
- Series can have associated pen name
- All books in series inherit pen name by default

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
├─────────────────────────────────────────────────────────────┤
│  /pen-names          │  /books           │  /settings       │
│  ├── page.tsx        │  ├── page.tsx     │  /author-profile │
│  └── [id]/page.tsx   │  └── [id]/page.tsx│  └── page.tsx    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
├─────────────────────────────────────────────────────────────┤
│  /api/pen-names/*    │  /api/books/*     │  /api/author-*   │
│  (NEW)               │  (EXTENDED)       │  (EXTENDED)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Database                               │
├─────────────────────────────────────────────────────────────┤
│  pen_names (NEW)     │  books (EXTENDED) │  author_profile  │
│  pen_name_genres     │  book_platforms   │  (EXISTING)      │
│  (NEW)               │  (NEW)            │                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User creates pen name
        │
        ▼
pen_names table (NEW)
        │
        ▼
User assigns pen name to project/book
        │
        ▼
projects.pen_name_id / books.pen_name_id
        │
        ▼
Export uses pen name profile for author section
```

---

## Implementation Plan

### Phase 1: Foundation (Sprint 1)
**Goal**: Complete existing infrastructure, create pen names table

1. Extend author profile UI to show all fields
2. Create pen_names database table
3. Create pen names CRUD API
4. Build basic pen names list page

### Phase 2: Pen Name Management (Sprint 2)
**Goal**: Full pen name CRUD with portfolio view

1. Pen name create/edit forms
2. Photo upload for pen names
3. Pen name portfolio page
4. Link pen names to projects

### Phase 3: Book Tracking (Sprint 3)
**Goal**: Comprehensive book dashboard

1. Extend books table with publishing metadata
2. Books dashboard page with filters
3. Book detail/edit page
4. Status workflow UI

### Phase 4: Integration (Sprint 4)
**Goal**: Connect everything together

1. Pen name dropdown on project/book forms
2. Export integration with pen names
3. Series-level pen name defaults
4. Analytics/statistics

---

## Task Breakdown

### Phase 1: Foundation

#### Epic 1.1: Author Profile UI Completion

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 1.1.1 | Add Personal Information section to author profile page | 2h | - |
| 1.1.2 | Add author_name field with label "Legal Name" | 0.5h | 1.1.1 |
| 1.1.3 | Add pen_name field with label "Primary Pen Name" | 0.5h | 1.1.1 |
| 1.1.4 | Add preferred_pronouns dropdown | 0.5h | 1.1.1 |
| 1.1.5 | Add Contact Information section | 1h | - |
| 1.1.6 | Add contact_email, contact_phone fields | 0.5h | 1.1.5 |
| 1.1.7 | Add contact_address, city, postcode, country fields | 1h | 1.1.5 |
| 1.1.8 | Add Writing Credentials section | 1h | - |
| 1.1.9 | Create credentials array editor (add/remove items) | 2h | 1.1.8 |
| 1.1.10 | Add author_bio_short field with character count | 1h | - |
| 1.1.11 | Update author-profile API to return all fields | 1h | - |
| 1.1.12 | Update author-profile API to save all fields | 1h | 1.1.11 |
| 1.1.13 | Add form validation for all new fields | 1h | 1.1.1-1.1.10 |
| 1.1.14 | Write tests for author profile updates | 2h | 1.1.12 |

**Subtotal**: 15 hours

#### Epic 1.2: Pen Names Database

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 1.2.1 | Create migration file for pen_names table | 1h | - |
| 1.2.2 | Add pen_name_id foreign key to projects table | 0.5h | 1.2.1 |
| 1.2.3 | Add pen_name_id foreign key to books table | 0.5h | 1.2.1 |
| 1.2.4 | Create pen_name_genres junction table | 0.5h | 1.2.1 |
| 1.2.5 | Add indexes for pen_name lookups | 0.5h | 1.2.1 |
| 1.2.6 | Create data migration for existing author_name values | 1h | 1.2.1 |
| 1.2.7 | Write rollback migration | 0.5h | 1.2.1 |
| 1.2.8 | Test migration on sample data | 1h | 1.2.6 |

**Subtotal**: 5.5 hours

#### Epic 1.3: Pen Names API

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 1.3.1 | Create pen-names route file structure | 0.5h | 1.2.1 |
| 1.3.2 | Implement GET /api/pen-names (list all) | 1h | 1.3.1 |
| 1.3.3 | Implement GET /api/pen-names/:id (get one) | 0.5h | 1.3.1 |
| 1.3.4 | Implement POST /api/pen-names (create) | 1h | 1.3.1 |
| 1.3.5 | Implement PUT /api/pen-names/:id (update) | 1h | 1.3.1 |
| 1.3.6 | Implement DELETE /api/pen-names/:id (soft delete) | 1h | 1.3.1 |
| 1.3.7 | Implement POST /api/pen-names/:id/photo (upload) | 1.5h | 1.3.1 |
| 1.3.8 | Implement PUT /api/pen-names/:id/default (set default) | 0.5h | 1.3.1 |
| 1.3.9 | Implement GET /api/pen-names/:id/books (books by pen name) | 1h | 1.3.1 |
| 1.3.10 | Implement GET /api/pen-names/:id/stats (statistics) | 1h | 1.3.1 |
| 1.3.11 | Add input validation with Zod schemas | 1h | 1.3.2-1.3.10 |
| 1.3.12 | Write API tests for all endpoints | 3h | 1.3.2-1.3.10 |

**Subtotal**: 13 hours

#### Epic 1.4: Basic Pen Names UI

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 1.4.1 | Create /pen-names page route | 0.5h | 1.3.2 |
| 1.4.2 | Create PenNameCard component | 1.5h | - |
| 1.4.3 | Create PenNamesList component | 1h | 1.4.2 |
| 1.4.4 | Add "Create Pen Name" button and empty state | 1h | 1.4.3 |
| 1.4.5 | Create usePenNames hook for data fetching | 1h | 1.3.2 |
| 1.4.6 | Wire up list page with API | 1h | 1.4.3, 1.4.5 |
| 1.4.7 | Add pen names link to navigation/settings | 0.5h | 1.4.1 |

**Subtotal**: 6.5 hours

**Phase 1 Total**: 40 hours (~1 week)

---

### Phase 2: Pen Name Management

#### Epic 2.1: Pen Name Forms

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 2.1.1 | Create PenNameForm component | 2h | 1.4.1 |
| 2.1.2 | Add display_name field with preview | 0.5h | 2.1.1 |
| 2.1.3 | Add bio textarea with markdown support | 1h | 2.1.1 |
| 2.1.4 | Add bio_short field with character counter (100 words) | 1h | 2.1.1 |
| 2.1.5 | Add website URL field with validation | 0.5h | 2.1.1 |
| 2.1.6 | Create SocialMediaEditor component | 2h | - |
| 2.1.7 | Integrate SocialMediaEditor into form | 0.5h | 2.1.1, 2.1.6 |
| 2.1.8 | Add genre multi-select for pen name | 1h | 2.1.1 |
| 2.1.9 | Add is_public toggle with explanation | 0.5h | 2.1.1 |
| 2.1.10 | Add is_default toggle (only one allowed) | 0.5h | 2.1.1 |
| 2.1.11 | Create /pen-names/new page | 1h | 2.1.1 |
| 2.1.12 | Create /pen-names/[id]/edit page | 1h | 2.1.1 |
| 2.1.13 | Add form submission with API integration | 1h | 2.1.11, 2.1.12 |
| 2.1.14 | Add success/error toast notifications | 0.5h | 2.1.13 |

**Subtotal**: 13 hours

#### Epic 2.2: Pen Name Photo Management

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 2.2.1 | Create PenNamePhotoUpload component | 2h | - |
| 2.2.2 | Add image preview with placeholder | 1h | 2.2.1 |
| 2.2.3 | Add drag-and-drop upload | 1h | 2.2.1 |
| 2.2.4 | Add image cropping modal | 2h | 2.2.1 |
| 2.2.5 | Integrate photo upload with API | 1h | 2.2.1, 1.3.7 |
| 2.2.6 | Add delete photo functionality | 0.5h | 2.2.5 |
| 2.2.7 | Handle loading and error states | 0.5h | 2.2.5 |

**Subtotal**: 8 hours

#### Epic 2.3: Pen Name Portfolio Page

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 2.3.1 | Create /pen-names/[id] page route | 0.5h | 1.3.3 |
| 2.3.2 | Create PenNameHeader component (photo, name, bio) | 1.5h | - |
| 2.3.3 | Create PenNameStats component (books, words, genres) | 1.5h | 1.3.10 |
| 2.3.4 | Create PenNameBooksList component | 1.5h | 1.3.9 |
| 2.3.5 | Add social media links display | 0.5h | 2.3.2 |
| 2.3.6 | Add "Edit Pen Name" button | 0.5h | 2.3.1 |
| 2.3.7 | Add "Export About Author" button | 1h | 2.3.1 |
| 2.3.8 | Wire up page with API data | 1h | 2.3.1-2.3.4 |

**Subtotal**: 8 hours

#### Epic 2.4: Project-Pen Name Integration

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 2.4.1 | Create PenNameSelect dropdown component | 1.5h | 1.3.2 |
| 2.4.2 | Add pen name select to project creation form | 1h | 2.4.1 |
| 2.4.3 | Add pen name select to project edit page | 1h | 2.4.1 |
| 2.4.4 | Update project API to handle pen_name_id | 1h | 1.2.2 |
| 2.4.5 | Migrate existing author_name to pen_name_id where possible | 1.5h | 2.4.4 |
| 2.4.6 | Show pen name on project cards | 0.5h | 2.4.4 |
| 2.4.7 | Add filter by pen name on projects page | 1h | 2.4.4 |

**Subtotal**: 7.5 hours

**Phase 2 Total**: 36.5 hours (~1 week)

---

### Phase 3: Book Tracking

#### Epic 3.1: Books Database Extension

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 3.1.1 | Create migration for books table extensions | 1h | - |
| 3.1.2 | Add isbn column | 0.25h | 3.1.1 |
| 3.1.3 | Add publication_date column | 0.25h | 3.1.1 |
| 3.1.4 | Add publication_status column with enum | 0.5h | 3.1.1 |
| 3.1.5 | Add blurb column (TEXT) | 0.25h | 3.1.1 |
| 3.1.6 | Add keywords column (JSON) | 0.25h | 3.1.1 |
| 3.1.7 | Add cover_image column (base64) | 0.25h | 3.1.1 |
| 3.1.8 | Add cover_image_type column | 0.25h | 3.1.1 |
| 3.1.9 | Create book_platforms junction table | 0.5h | 3.1.1 |
| 3.1.10 | Add indexes for dashboard queries | 0.5h | 3.1.1 |
| 3.1.11 | Test migration | 0.5h | 3.1.1 |

**Subtotal**: 4.5 hours

#### Epic 3.2: Books API Extension

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 3.2.1 | Update GET /api/books to include new fields | 1h | 3.1.1 |
| 3.2.2 | Update PUT /api/books/:id to handle new fields | 1h | 3.1.1 |
| 3.2.3 | Implement GET /api/books/all (cross-project) | 1.5h | 3.1.1 |
| 3.2.4 | Add filtering params (pen_name, status, genre, date) | 1.5h | 3.2.3 |
| 3.2.5 | Add sorting params | 0.5h | 3.2.3 |
| 3.2.6 | Add pagination | 1h | 3.2.3 |
| 3.2.7 | Implement PATCH /api/books/:id/status | 1h | 3.1.4 |
| 3.2.8 | Implement POST /api/books/:id/cover | 1.5h | 3.1.7 |
| 3.2.9 | Implement GET /api/books/stats (dashboard stats) | 1h | 3.2.3 |
| 3.2.10 | Add Zod validation for new fields | 1h | 3.2.1-3.2.8 |
| 3.2.11 | Write API tests | 2h | 3.2.1-3.2.9 |

**Subtotal**: 13 hours

#### Epic 3.3: Books Dashboard Page

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 3.3.1 | Create /books page route | 0.5h | 3.2.3 |
| 3.3.2 | Create BooksDashboardStats component | 1.5h | 3.2.9 |
| 3.3.3 | Create BooksTable component | 2h | - |
| 3.3.4 | Add sortable column headers | 1h | 3.3.3 |
| 3.3.5 | Create BooksFilters component | 2h | - |
| 3.3.6 | Add pen name filter dropdown | 0.5h | 3.3.5, 2.4.1 |
| 3.3.7 | Add status filter dropdown | 0.5h | 3.3.5 |
| 3.3.8 | Add genre filter dropdown | 0.5h | 3.3.5 |
| 3.3.9 | Add date range filter | 1h | 3.3.5 |
| 3.3.10 | Add search input (title, series) | 1h | 3.3.5 |
| 3.3.11 | Create useBooksData hook | 1h | 3.2.3 |
| 3.3.12 | Wire up dashboard with API | 1h | 3.3.1-3.3.11 |
| 3.3.13 | Add pagination controls | 1h | 3.2.6 |
| 3.3.14 | Add empty state | 0.5h | 3.3.3 |
| 3.3.15 | Add books link to main navigation | 0.5h | 3.3.1 |

**Subtotal**: 14.5 hours

#### Epic 3.4: Book Detail/Edit Page

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 3.4.1 | Create /books/[id] page route | 0.5h | 3.2.1 |
| 3.4.2 | Create BookHeader component | 1h | - |
| 3.4.3 | Create BookMetadataForm component | 2h | - |
| 3.4.4 | Add ISBN field with format validation | 0.5h | 3.4.3 |
| 3.4.5 | Add publication date picker | 0.5h | 3.4.3 |
| 3.4.6 | Add publication status select | 0.5h | 3.4.3 |
| 3.4.7 | Add blurb textarea with character count | 1h | 3.4.3 |
| 3.4.8 | Create KeywordsEditor component | 1.5h | - |
| 3.4.9 | Create PlatformsChecklist component | 1h | - |
| 3.4.10 | Create BookCoverUpload component | 2h | 3.2.8 |
| 3.4.11 | Add form submission | 1h | 3.4.3-3.4.10 |
| 3.4.12 | Add success/error handling | 0.5h | 3.4.11 |

**Subtotal**: 12 hours

#### Epic 3.5: Status Workflow

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 3.5.1 | Create StatusPipeline component | 2h | - |
| 3.5.2 | Add visual status badges | 1h | - |
| 3.5.3 | Add status change modal | 1h | 3.5.1 |
| 3.5.4 | Create status history component | 1.5h | - |
| 3.5.5 | Add bulk status update (select multiple books) | 2h | 3.3.3 |
| 3.5.6 | Add status change audit log (database) | 1h | - |
| 3.5.7 | Display status on book cards | 0.5h | 3.5.2 |

**Subtotal**: 9 hours

**Phase 3 Total**: 53 hours (~1.3 weeks)

---

### Phase 4: Integration & Polish

#### Epic 4.1: Export Integration

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 4.1.1 | Update export service to use pen name profile | 1.5h | 2.4.4 |
| 4.1.2 | Add pen name bio to "About the Author" section | 1h | 4.1.1 |
| 4.1.3 | Add pen name photo to exports | 1h | 4.1.1 |
| 4.1.4 | Add pen name website/social to back matter | 1h | 4.1.1 |
| 4.1.5 | Create pen name portfolio PDF export | 2h | 2.3.7 |
| 4.1.6 | Test exports with multiple pen names | 1h | 4.1.1-4.1.5 |

**Subtotal**: 7.5 hours

#### Epic 4.2: Series Integration

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 4.2.1 | Add pen_name_id to series table | 0.5h | 1.2.1 |
| 4.2.2 | Add pen name select to series creation | 1h | 4.2.1 |
| 4.2.3 | Add pen name display on series page | 0.5h | 4.2.1 |
| 4.2.4 | Auto-inherit pen name for new books in series | 1h | 4.2.1 |
| 4.2.5 | Validate pen name consistency in series | 1h | 4.2.4 |

**Subtotal**: 4 hours

#### Epic 4.3: Analytics & Statistics

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 4.3.1 | Create /analytics page route | 0.5h | - |
| 4.3.2 | Create PortfolioStats component | 1.5h | - |
| 4.3.3 | Add books by pen name chart | 1.5h | 4.3.2 |
| 4.3.4 | Add books by genre chart | 1.5h | 4.3.2 |
| 4.3.5 | Add books by status chart | 1h | 4.3.2 |
| 4.3.6 | Add words written by year chart | 1.5h | 4.3.2 |
| 4.3.7 | Add publication timeline | 2h | 4.3.2 |
| 4.3.8 | Create stats API endpoints | 2h | 4.3.2-4.3.7 |

**Subtotal**: 11.5 hours

#### Epic 4.4: UI Polish & UX

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 4.4.1 | Add loading skeletons to all new pages | 2h | - |
| 4.4.2 | Add error boundaries | 1h | - |
| 4.4.3 | Add keyboard shortcuts (n: new, e: edit) | 1h | - |
| 4.4.4 | Add responsive design for mobile | 2h | - |
| 4.4.5 | Add dark mode support for new components | 1h | - |
| 4.4.6 | Add help tooltips | 1h | - |
| 4.4.7 | Add onboarding flow for first pen name | 2h | - |
| 4.4.8 | Performance optimisation (lazy loading) | 1.5h | - |

**Subtotal**: 11.5 hours

#### Epic 4.5: Testing & Documentation

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| 4.5.1 | Write E2E tests for pen name management | 3h | Phase 2 |
| 4.5.2 | Write E2E tests for books dashboard | 3h | Phase 3 |
| 4.5.3 | Write component unit tests | 3h | Phases 2-4 |
| 4.5.4 | Update API documentation | 2h | All APIs |
| 4.5.5 | Create user guide for pen names | 1.5h | - |
| 4.5.6 | Create user guide for book tracking | 1.5h | - |

**Subtotal**: 14 hours

**Phase 4 Total**: 48.5 hours (~1.2 weeks)

---

## Summary: Task Estimates

| Phase | Description | Hours | Weeks |
|-------|-------------|-------|-------|
| Phase 1 | Foundation | 40h | 1 |
| Phase 2 | Pen Name Management | 36.5h | 1 |
| Phase 3 | Book Tracking | 53h | 1.3 |
| Phase 4 | Integration & Polish | 48.5h | 1.2 |
| **Total** | | **178h** | **~4.5 weeks** |

---

## UI/UX Specifications

### Navigation Updates

```
Settings
├── Profile
├── Author Profile (existing - enhanced)
├── Pen Names (NEW) ─────────────────────┐
├── Preferences                          │
└── ...                                  │
                                         │
Main Navigation                          │
├── Projects                             │
├── Series                               │
├── Books (NEW) ◄────────────────────────┤
├── Pen Names (NEW) ◄────────────────────┘
└── Analytics (NEW)
```

### Pen Names List Page (`/pen-names`)

```
┌─────────────────────────────────────────────────────────────┐
│  Pen Names                                    [+ New Pen Name] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ 📷              │  │ 📷              │                 │
│  │ Sarah Blake      │  │ J.R. Thornton   │                 │
│  │ Romance, Drama   │  │ Thriller        │                 │
│  │ 12 books • 450K  │  │ 5 books • 230K  │                 │
│  │ ⭐ Default       │  │                 │                 │
│  │ [View] [Edit]    │  │ [View] [Edit]   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Pen Name Portfolio Page (`/pen-names/[id]`)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Pen Names                              [Edit]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────┐  Sarah Blake                                        │
│  │ 📷  │  Romance & Contemporary Drama Author                │
│  └─────┘                                                      │
│           sarahblakebooks.com | @sarahblake                  │
│                                                               │
│  ─────────────────────────────────────────────────────────── │
│                                                               │
│  📊 Statistics                                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ 12 Books   │ │ 450,000    │ │ 3 Series   │               │
│  │            │ │ words      │ │            │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│                                                               │
│  📚 Books                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Title           │ Series      │ Status    │ Words      ││
│  │ Summer Hearts   │ Beach Town  │ Published │ 85,000     ││
│  │ Winter Promise  │ Beach Town  │ Published │ 78,000     ││
│  │ New Beginnings  │ Standalone  │ Draft     │ 42,000     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Books Dashboard (`/books`)

```
┌─────────────────────────────────────────────────────────────┐
│  Books Dashboard                                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │ 17 Total   │ │ 680,000    │ │ 8 Published│ │ 3 In       ││
│  │ Books      │ │ Words      │ │            │ │ Progress   ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘│
│                                                               │
│  Filters:                                                    │
│  [Pen Name ▼] [Status ▼] [Genre ▼] [Series ▼] [🔍 Search]   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☐ │ Title         │ Pen Name    │ Series   │ Status     ││
│  ├───┼───────────────┼─────────────┼──────────┼────────────┤│
│  │ ☐ │ Summer Hearts │ Sarah Blake │ Beach... │ 🟢 Published││
│  │ ☐ │ Dark Pursuit  │ J.R. Thorn..│ -        │ 🟡 Editing ││
│  │ ☐ │ New Beginnings│ Sarah Blake │ -        │ 🔵 Draft   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  [< Prev] Page 1 of 2 [Next >]                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Book Status Badges

| Status | Colour | Icon |
|--------|--------|------|
| Draft | Blue | 🔵 |
| Beta Readers | Purple | 🟣 |
| Editing | Yellow | 🟡 |
| Submitted | Orange | 🟠 |
| Published | Green | 🟢 |

---

## API Specifications

### Pen Names API

#### `GET /api/pen-names`

Returns all pen names for the current user.

**Response:**
```json
{
  "penNames": [
    {
      "id": "uuid",
      "pen_name": "Sarah Blake",
      "display_name": "Sarah Blake",
      "bio": "Romance author...",
      "bio_short": "Sarah writes contemporary romance...",
      "photo": "base64...",
      "photo_type": "image/jpeg",
      "website": "https://sarahblakebooks.com",
      "social_media": {
        "twitter": "@sarahblake",
        "instagram": "sarahblakeauthor"
      },
      "genres": ["romance", "contemporary"],
      "is_public": true,
      "is_default": true,
      "book_count": 12,
      "word_count": 450000,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-06-20T14:30:00Z"
    }
  ]
}
```

#### `POST /api/pen-names`

Creates a new pen name.

**Request:**
```json
{
  "pen_name": "J.R. Thornton",
  "display_name": "J.R. Thornton",
  "bio": "Thriller writer...",
  "bio_short": "J.R. writes edge-of-your-seat thrillers...",
  "website": "https://jrthornton.com",
  "social_media": {
    "twitter": "@jrthornton"
  },
  "genres": ["thriller", "mystery"],
  "is_public": false,
  "is_default": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "pen_name": "J.R. Thornton",
  ...
}
```

#### `GET /api/pen-names/:id/books`

Returns all books for a specific pen name.

**Response:**
```json
{
  "books": [
    {
      "id": "uuid",
      "title": "Dark Pursuit",
      "series_name": null,
      "status": "draft",
      "publication_status": "editing",
      "word_count": 75000,
      "genre": "thriller"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

#### `GET /api/pen-names/:id/stats`

Returns statistics for a pen name.

**Response:**
```json
{
  "book_count": 12,
  "series_count": 3,
  "total_words": 450000,
  "published_count": 8,
  "draft_count": 4,
  "genres": {
    "romance": 8,
    "contemporary": 4
  },
  "books_by_year": {
    "2023": 3,
    "2024": 5
  }
}
```

### Books API Extensions

#### `GET /api/books/all`

Returns all books across all projects with filtering.

**Query Parameters:**
- `pen_name_id` - Filter by pen name
- `status` - Filter by publication status
- `genre` - Filter by genre
- `series_id` - Filter by series
- `search` - Search title/series name
- `sort` - Sort field (title, status, word_count, publication_date)
- `order` - Sort order (asc, desc)
- `page` - Page number
- `pageSize` - Items per page

**Response:**
```json
{
  "books": [...],
  "total": 17,
  "page": 1,
  "pageSize": 20,
  "stats": {
    "total_books": 17,
    "total_words": 680000,
    "by_status": {
      "draft": 4,
      "editing": 3,
      "published": 8
    }
  }
}
```

---

## Database Schema

### New Tables

#### `pen_names`

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
    social_media TEXT,           -- JSON
    genres TEXT,                 -- JSON array
    is_public BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    deleted_at TEXT,             -- Soft delete
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, pen_name)
);

CREATE INDEX idx_pen_names_user ON pen_names(user_id);
CREATE INDEX idx_pen_names_default ON pen_names(user_id, is_default);
```

#### `book_platforms`

```sql
CREATE TABLE book_platforms (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,      -- 'kdp', 'apple', 'kobo', 'google', 'smashwords', 'draft2digital', 'ingram', 'other'
    platform_url TEXT,           -- Link to book on platform
    status TEXT DEFAULT 'pending', -- 'pending', 'submitted', 'live', 'removed'
    published_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(book_id, platform)
);

CREATE INDEX idx_book_platforms_book ON book_platforms(book_id);
```

#### `book_status_history`

```sql
CREATE TABLE book_status_history (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TEXT DEFAULT (datetime('now')),
    notes TEXT
);

CREATE INDEX idx_book_status_history_book ON book_status_history(book_id);
```

### Table Modifications

#### `books` (ALTER)

```sql
ALTER TABLE books ADD COLUMN pen_name_id TEXT REFERENCES pen_names(id);
ALTER TABLE books ADD COLUMN isbn TEXT;
ALTER TABLE books ADD COLUMN publication_date TEXT;
ALTER TABLE books ADD COLUMN publication_status TEXT DEFAULT 'draft'
    CHECK(publication_status IN ('draft', 'beta_readers', 'editing', 'submitted', 'published'));
ALTER TABLE books ADD COLUMN blurb TEXT;
ALTER TABLE books ADD COLUMN keywords TEXT;          -- JSON array
ALTER TABLE books ADD COLUMN cover_image TEXT;       -- base64
ALTER TABLE books ADD COLUMN cover_image_type TEXT;

CREATE INDEX idx_books_pen_name ON books(pen_name_id);
CREATE INDEX idx_books_publication_status ON books(publication_status);
```

#### `projects` (ALTER)

```sql
ALTER TABLE projects ADD COLUMN pen_name_id TEXT REFERENCES pen_names(id);

CREATE INDEX idx_projects_pen_name ON projects(pen_name_id);
```

#### `series` (ALTER)

```sql
ALTER TABLE series ADD COLUMN pen_name_id TEXT REFERENCES pen_names(id);

CREATE INDEX idx_series_pen_name ON series(pen_name_id);
```

---

## Testing Requirements

### Unit Tests

| Area | Tests Required |
|------|----------------|
| Pen Names API | Create, read, update, delete, list, stats |
| Books API | Extended CRUD, filtering, pagination |
| Components | PenNameCard, PenNameForm, BooksTable, StatusPipeline |
| Hooks | usePenNames, useBooksData |

### Integration Tests

| Flow | Description |
|------|-------------|
| Pen name lifecycle | Create → Edit → Assign books → Delete |
| Book tracking | Create book → Update status → Publish |
| Export with pen name | Export book → Verify pen name in output |

### E2E Tests

| Scenario | Steps |
|----------|-------|
| New author setup | Create pen name → Create project → Create book |
| Portfolio view | Create multiple books → Filter by pen name → Verify counts |
| Status workflow | Change book status → Verify history → Verify dashboard |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pen name creation | Users create 2+ pen names | Database count |
| Book tracking adoption | 80% of books have status set | Database query |
| Dashboard usage | 50% weekly active users visit /books | Analytics |
| Export completeness | 90% exports include pen name bio | Export logs |

---

## Appendix: File Structure

### New Files to Create

```
backend/src/
├── routes/
│   └── pen-names/
│       ├── index.ts           # Router composition
│       ├── crud.ts            # CRUD operations
│       ├── portfolio.ts       # Portfolio & stats
│       └── utils.ts           # Shared utilities
├── db/
│   └── migrations/
│       ├── 0XX-pen-names.sql
│       └── 0XX-books-publishing.sql

app/
├── pen-names/
│   ├── page.tsx               # List page
│   ├── new/
│   │   └── page.tsx           # Create page
│   └── [id]/
│       ├── page.tsx           # Portfolio page
│       └── edit/
│           └── page.tsx       # Edit page
├── books/
│   ├── page.tsx               # Dashboard
│   └── [id]/
│       └── page.tsx           # Detail/edit page
├── analytics/
│   └── page.tsx               # Statistics page
├── components/
│   ├── pen-names/
│   │   ├── PenNameCard.tsx
│   │   ├── PenNameForm.tsx
│   │   ├── PenNameSelect.tsx
│   │   ├── PenNamePhotoUpload.tsx
│   │   └── PenNameStats.tsx
│   └── books/
│       ├── BooksTable.tsx
│       ├── BooksFilters.tsx
│       ├── BookMetadataForm.tsx
│       ├── BookCoverUpload.tsx
│       ├── StatusPipeline.tsx
│       └── StatusBadge.tsx
├── hooks/
│   ├── usePenNames.ts
│   └── useBooksData.ts
└── lib/
    └── book-data/
        ├── index.ts
        ├── publication-statuses.ts
        └── platforms.ts
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-30 | Claude | Initial specification |
