-- Extend books table with publishing metadata
ALTER TABLE books ADD COLUMN pen_name_id TEXT REFERENCES pen_names(id);
ALTER TABLE books ADD COLUMN isbn TEXT;
ALTER TABLE books ADD COLUMN publication_date TEXT;
ALTER TABLE books ADD COLUMN publication_status TEXT DEFAULT 'draft' CHECK(publication_status IN ('draft', 'beta_readers', 'editing', 'submitted', 'published'));
ALTER TABLE books ADD COLUMN blurb TEXT;
ALTER TABLE books ADD COLUMN keywords TEXT;          -- JSON array
ALTER TABLE books ADD COLUMN cover_image TEXT;       -- base64 encoded
ALTER TABLE books ADD COLUMN cover_image_type TEXT;

-- Indexes for books
CREATE INDEX IF NOT EXISTS idx_books_pen_name ON books(pen_name_id);
CREATE INDEX IF NOT EXISTS idx_books_publication_status ON books(publication_status);
CREATE INDEX IF NOT EXISTS idx_books_publication_date ON books(publication_date);

-- Book platforms table (where book is published)
CREATE TABLE IF NOT EXISTS book_platforms (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,      -- 'kdp', 'apple', 'kobo', 'google', 'barnes_noble', 'smashwords', 'draft2digital', 'ingram', 'other'
    platform_url TEXT,           -- Link to book on platform
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'live', 'removed')),
    published_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(book_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_book_platforms_book ON book_platforms(book_id);

-- Book status history table (audit log)
CREATE TABLE IF NOT EXISTS book_status_history (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TEXT DEFAULT (datetime('now')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_book_status_history_book ON book_status_history(book_id);
CREATE INDEX IF NOT EXISTS idx_book_status_history_date ON book_status_history(changed_at);
