# Bug Hunting Report: React Hooks & SQL Injection Audit
**Date**: 2026-01-25
**Detective**: Ray Morrison (Bug Hunter Agent)
**Analyzed**: Frontend components (33 files) and Backend routes/repositories (24 files)
**Risk Score**: 6/10
**Bugs Found**:
- Critical: 1 (SQL Injection Risk)
- High: 3 (React Hook Dependency Warnings)
- Medium: 1 (Missing dependency warning)
- Low: 0

---

## Executive Summary

Conducted systematic bug hunt focusing on React Hook dependency warnings (BUG-009) and SQL injection risks (BUG-010). Found 1 critical SQL injection vulnerability in base repository pattern and 4 React Hook dependency issues that could cause unnecessary re-renders or stale closures.

**Good News**: All SQL queries in routes properly use parameterized statements. No active SQL injection vulnerabilities.

**Concerns**: The repository layer has unsafe dynamic column/orderBy construction that could become vulnerable if user input ever reaches these methods. React components have widespread pattern of useCallback + useEffect dependency loops.

---

## Critical Bugs (Production Risk)

### BUG-009-A: SQL Injection via Dynamic Column Names in Base Repository

- **Location**: `backend/src/repositories/base.repository.ts:98, 121, 124, 208, 244, 282`
- **Severity**: **CRITICAL**
- **Type**: SQL Injection (Dynamic SQL Construction)
- **Description**: The BaseRepository uses unvalidated string interpolation for column names, ORDER BY clauses, and INSERT/UPDATE column lists. While currently only called internally with hardcoded values, if any route passes user input to `findBy()`, `findAll()` with orderBy option, or uses the column parameter, SQL injection is possible.

- **Trigger Condition**:
  ```typescript
  // If user input reaches these parameters:
  repository.findAll({ orderBy: req.query.sort }); // SQL INJECTION
  repository.findBy(req.query.column, value); // SQL INJECTION
  ```

- **Impact**:
  - SQL injection allowing data exfiltration
  - Unauthorized data modification or deletion
  - Potential database compromise

- **Evidence**:
  ```typescript
  // Line 98 - Dynamic ORDER BY from options
  if (options.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`;  // UNSAFE! No validation
  }

  // Line 121 - Dynamic column name in WHERE clause
  let sql = `SELECT ... FROM ${this.tableName} WHERE ${column} = ?`;  // UNSAFE!

  // Line 208 - Dynamic column names in INSERT
  const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ...`;
  ```

- **Attack Example**:
  ```typescript
  // Attacker sends: ?sort=id; DROP TABLE users--
  repository.findAll({ orderBy: "id; DROP TABLE users--" });
  // Resulting SQL:
  // SELECT * FROM projects ORDER BY id; DROP TABLE users--
  ```

- **Current Risk Level**: Medium (internal use only, but dangerous pattern)

- **Reproduction Steps**:
  1. Find any route that passes req.query/req.body to repository methods
  2. Send malicious column name or orderBy value
  3. SQL injection executes

- **Fix**:
  ```typescript
  /**
   * Add to BaseRepository class
   */
  export abstract class BaseRepository<T extends BaseEntity> {
    protected db: Database.Database;
    protected tableName: string;
    protected entityName: string;

    // NEW: Whitelist for allowed columns
    private allowedColumns: Set<string> = new Set();
    private allowedOrderByColumns: Set<string> = new Set();

    constructor(db: Database.Database, tableName: string, entityName: string) {
      this.db = db;
      this.tableName = tableName;
      this.entityName = entityName;
      // Subclasses must call setAllowedColumns in their constructor
    }

    /**
     * Subclasses MUST call this to set allowed columns
     */
    protected setAllowedColumns(columns: string[]): void {
      this.allowedColumns = new Set(columns);
      // By default, all columns can be used in ORDER BY
      this.allowedOrderByColumns = new Set(columns);
    }

    /**
     * Override to set different ORDER BY whitelist
     */
    protected setAllowedOrderByColumns(columns: string[]): void {
      this.allowedOrderByColumns = new Set(columns);
    }

    /**
     * Validate column name against whitelist
     */
    private validateColumn(column: string): void {
      if (!this.allowedColumns.has(column)) {
        throw new Error(`Invalid column: ${column}`);
      }
    }

    /**
     * Validate ORDER BY clause format and column
     */
    private validateOrderBy(orderBy: string): void {
      // Parse "column ASC" or "column DESC" or just "column"
      const match = orderBy.trim().match(/^(\w+)(\s+(ASC|DESC))?$/i);
      if (!match) {
        throw new Error(`Invalid ORDER BY clause format: ${orderBy}`);
      }

      const column = match[1];
      if (!this.allowedOrderByColumns.has(column)) {
        throw new Error(`Invalid ORDER BY column: ${column}`);
      }
    }

    /**
     * Validate array of column names
     */
    private validateColumns(columns: string[]): void {
      for (const col of columns) {
        this.validateColumn(col);
      }
    }

    // UPDATE: findAll with validation
    findAll(options: FindOptions = {}): T[] {
      // Validate columns if provided
      if (options.columns) {
        this.validateColumns(options.columns);
      }

      let sql = `SELECT ${options.columns?.join(', ') || '*'} FROM ${this.tableName}`;

      if (options.orderBy) {
        this.validateOrderBy(options.orderBy);  // ADD THIS
        sql += ` ORDER BY ${options.orderBy}`;
      }

      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
      }

      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }

      const { result } = queryMonitor.wrapSync(sql, () => {
        const stmt = this.db.prepare<[], T>(sql);
        return stmt.all();
      });

      return result;
    }

    // UPDATE: findBy with validation
    findBy(column: string, value: string | number, options: FindOptions = {}): T[] {
      this.validateColumn(column);  // ADD THIS

      if (options.columns) {
        this.validateColumns(options.columns);
      }

      let sql = `SELECT ${options.columns?.join(', ') || '*'} FROM ${this.tableName} WHERE ${column} = ?`;

      if (options.orderBy) {
        this.validateOrderBy(options.orderBy);  // ADD THIS
        sql += ` ORDER BY ${options.orderBy}`;
      }

      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
      }

      const { result } = queryMonitor.wrapSync(sql, () => {
        const stmt = this.db.prepare<[typeof value], T>(sql);
        return stmt.all(value);
      });

      return result;
    }

    // UPDATE: findOneBy with validation
    findOneBy(column: string, value: string | number): T | null {
      this.validateColumn(column);  // ADD THIS

      const sql = `SELECT * FROM ${this.tableName} WHERE ${column} = ? LIMIT 1`;

      const { result } = queryMonitor.wrapSync(sql, () => {
        const stmt = this.db.prepare<[typeof value], T>(sql);
        return stmt.get(value) || null;
      });

      return result;
    }

    // UPDATE: countBy with validation
    countBy(column: string, value: string | number): number {
      this.validateColumn(column);  // ADD THIS

      const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${column} = ?`;

      const { result } = queryMonitor.wrapSync(sql, () => {
        const stmt = this.db.prepare<[typeof value], { count: number }>(sql);
        return stmt.get(value)?.count || 0;
      });

      return result;
    }

    // UPDATE: create with validation
    create(data: Omit<T, 'created_at' | 'updated_at'>): T {
      const now = new Date().toISOString();
      const columns = Object.keys(data);

      this.validateColumns(columns);  // ADD THIS

      const values = Object.values(data);

      // Add timestamps
      columns.push('created_at', 'updated_at');
      values.push(now, now);

      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

      const { result } = queryMonitor.wrapSync(sql, () => {
        const stmt = this.db.prepare(sql);
        stmt.run(...values);
        return this.findById((data as any).id);
      });

      if (!result) {
        throw new Error(`Failed to create ${this.entityName}`);
      }

      logger.info({ id: (data as any).id }, `${this.entityName} created`);
      return result;
    }

    // UPDATE: update with validation
    update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): T | null {
      const columns = Object.keys(data);
      this.validateColumns(columns);  // ADD THIS

      const now = new Date().toISOString();
      const updates: string[] = [];
      const values: any[] = [];

      for (const [key, value] of Object.entries(data)) {
        if (key !== 'id' && key !== 'created_at') {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }

      // Always update timestamp
      updates.push('updated_at = ?');
      values.push(now);
      values.push(id);

      const sql = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`;

      const { result } = queryMonitor.wrapSync(sql, () => {
        const stmt = this.db.prepare(sql);
        const updateResult = stmt.run(...values);
        return updateResult.changes > 0 ? this.findById(id) : null;
      });

      if (result) {
        logger.info({ id }, `${this.entityName} updated`);
      }

      return result;
    }

    // UPDATE: deleteBy with validation
    deleteBy(column: string, value: string | number): number {
      this.validateColumn(column);  // ADD THIS

      const sql = `DELETE FROM ${this.tableName} WHERE ${column} = ?`;

      const { result } = queryMonitor.wrapSync(sql, () => {
        const stmt = this.db.prepare(sql);
        const deleteResult = stmt.run(value);
        return deleteResult.changes;
      });

      logger.info({ column, value, count: result }, `${this.entityName}s deleted`);
      return result;
    }
  }
  ```

- **Example Subclass Implementation**:
  ```typescript
  // backend/src/repositories/projects.repository.ts
  export class ProjectsRepository extends BaseRepository<Project> {
    constructor(db: Database.Database) {
      super(db, 'projects', 'Project');

      // REQUIRED: Define allowed columns for this table
      this.setAllowedColumns([
        'id',
        'user_id',
        'title',
        'type',
        'genre',
        'status',
        'story_dna',
        'story_bible',
        'plot_structure',
        'series_bible',
        'universe_id',
        'created_at',
        'updated_at'
      ]);

      // Optional: Override ORDER BY columns (if different from all columns)
      this.setAllowedOrderByColumns([
        'created_at',
        'updated_at',
        'title',
        'status'
      ]);
    }
  }
  ```

---

## High Severity Bugs

### BUG-009-B: useCallback + useEffect Dependency Loop in Plot Page

- **Location**: `app/projects/[id]/plot/page.tsx:123-167`
- **Severity**: **HIGH**
- **Type**: React Hook Dependency Warning / Potential Infinite Loop
- **Description**: `fetchData` is defined with `useCallback` depending on `projectId`, then used in `useEffect` dependency array. This creates unnecessary re-renders when projectId changes and risks infinite loops if fetchData ever modifies state that triggers projectId change.

- **Trigger Condition**: Component mounts or projectId changes
- **Impact**:
  - Unnecessary re-renders on every mount
  - Potential infinite render loop if state dependencies added
  - Performance degradation
  - ESLint exhaustive-deps warnings

- **Evidence**:
  ```typescript
  const fetchData = useCallback(async () => {
    // ... fetching logic
  }, [projectId]);  // fetchData changes when projectId changes

  useEffect(() => {
    fetchData();
  }, [fetchData]);  // useEffect depends on fetchData - triggers on every fetchData change
  ```

- **Why This Is Bad**:
  1. `useCallback` is meant for passing callbacks to child components, not for useEffect
  2. Every time `projectId` changes, `fetchData` gets a new identity
  3. New `fetchData` identity triggers `useEffect` to run
  4. This creates an extra render cycle

- **Reproduction Steps**:
  1. Navigate to plot page
  2. Open React DevTools Profiler
  3. Observe component re-renders twice on mount
  4. Change projectId (navigate to different project)
  5. Observe double render again

- **Fix**:
  ```typescript
  // REMOVE the useCallback wrapper
  // DELETE these lines:
  // const fetchData = useCallback(async () => {
  //   ...
  // }, [projectId]);

  // REPLACE the useEffect with inline function:
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        // Fetch project data for plot structure
        const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { headers });
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          if (projectData.plot_structure) {
            setStructure(projectData.plot_structure);
          }
        }

        // Fetch books
        const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, { headers });
        if (booksRes.ok) {
          const booksData = await booksRes.json();
          setBooks(booksData.books || []);

          // Fetch chapters for first book
          if (booksData.books?.length > 0) {
            const chaptersRes = await fetch(`${API_BASE_URL}/api/chapters/book/${booksData.books[0].id}`, { headers });
            if (chaptersRes.ok) {
              const chaptersData = await chaptersRes.json();
              setChapters(chaptersData.chapters || []);
              setTotalChapters(chaptersData.chapters?.length || 25);
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);  // Only depend on primitive value, not callback
  ```

---

### BUG-009-C: useCallback + useEffect Dependency Loop in Series Page

- **Location**: `app/projects/[id]/series/page.tsx:73-112`
- **Severity**: **HIGH**
- **Type**: React Hook Dependency Warning / Potential Infinite Loop
- **Description**: Identical pattern to BUG-009-B. `fetchData` wrapped in useCallback, then used in useEffect dependency array.

- **Trigger Condition**: Component mounts or projectId changes
- **Impact**: Same as BUG-009-B

- **Evidence**:
  ```typescript
  const fetchData = useCallback(async () => {
    // ... fetching logic
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);  // ESLint warning: fetchData will change on every render
  ```

- **Fix**:
  ```typescript
  // REPLACE useCallback + useEffect with:
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        // Fetch books
        const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, { headers });
        if (booksRes.ok) {
          const booksData = await booksRes.json();
          setBooks(booksData.books || []);
        }

        // Fetch series bible
        const bibleRes = await fetch(`${API_BASE_URL}/api/trilogy/projects/${projectId}/series-bible`, { headers });
        if (bibleRes.ok) {
          const bibleData = await bibleRes.json();
          setSeriesBible(bibleData);
        }

        // Fetch transitions
        const transRes = await fetch(`${API_BASE_URL}/api/trilogy/projects/${projectId}/transitions`, { headers });
        if (transRes.ok) {
          const transData = await transRes.json();
          setTransitions(transData.transitions || []);
        }
      } catch (err: any) {
        console.error('Error fetching series data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);  // Only depend on projectId
  ```

---

### BUG-009-D: useCallback + useEffect Dependency Loop in Chapter Editor

- **Location**: `app/components/ChapterEditor.tsx:57-90`
- **Severity**: **HIGH**
- **Type**: React Hook Dependency Warning / Potential Infinite Loop
- **Description**: Same pattern - `fetchChapterData` in useCallback depending on chapterId, used in useEffect.

- **Trigger Condition**: Component mounts or chapterId prop changes
- **Impact**: Same as BUG-009-B and BUG-009-C

- **Evidence**:
  ```typescript
  const fetchChapterData = useCallback(async () => {
    // ... fetch logic
  }, [chapterId]);

  useEffect(() => {
    fetchChapterData();
  }, [fetchChapterData]);  // Depends on callback that changes with chapterId
  ```

- **Fix**:
  ```typescript
  // REPLACE with inline function:
  useEffect(() => {
    const fetchChapterData = async () => {
      try {
        const res = await fetchWithAuth(`/api/editing/chapters/${chapterId}/edit`);

        if (!res.ok) {
          throw new Error('Failed to fetch chapter');
        }

        const data: ChapterEditResponse = await res.json();

        setOriginalContent(data.original.content);

        if (data.hasEdit && data.edit) {
          setContent(data.edit.edited_content);
          setIsLocked(data.edit.is_locked === 1);
          setEditNotes(data.edit.edit_notes || '');
        } else {
          setContent(data.original.content);
          setIsLocked(false);
          setEditNotes('');
        }

        calculateWordCount(data.hasEdit && data.edit ? data.edit.edited_content : data.original.content);
      } catch (error) {
        console.error('Error fetching chapter:', error);
        alert('Failed to load chapter');
      } finally {
        setLoading(false);
      }
    };

    fetchChapterData();
  }, [chapterId]);  // Only depend on chapterId

  // NOTE: calculateWordCount is defined outside useEffect, so it's stable
  // If it had dependencies, we'd need to either:
  // 1. Move it inside the useEffect
  // 2. Wrap it in useCallback with proper deps
  // 3. Make it a pure function (recommended)
  ```

---

## Medium Severity Bugs

### BUG-009-E: Missing loadAnalytics Dependency in AnalyticsDashboard

- **Location**: `app/components/AnalyticsDashboard.tsx:17-22`
- **Severity**: **MEDIUM**
- **Type**: Missing Hook Dependency
- **Description**: `loadAnalytics` function is called in useEffect but not defined in the dependency array. ESLint exhaustive-deps would warn about this. The function accesses state setters, creating a stale closure risk.

- **Trigger Condition**: bookId changes
- **Impact**:
  - Stale closure - function may reference old bookId
  - ESLint exhaustive-deps warning
  - Potential bugs if loadAnalytics is modified later

- **Evidence**:
  ```typescript
  useEffect(() => {
    loadAnalytics().catch(err => {
      console.error('Failed to load analytics on mount:', err);
      setLoading(false);
    });
  }, [bookId]);  // loadAnalytics not in dependencies

  const loadAnalytics = async () => {
    // Function uses bookId but isn't in useEffect deps
    const bookResponse = await fetch(`/api/analytics/book/${bookId}`);
  };
  ```

- **Why This Matters**:
  - Currently works because bookId is captured in closure
  - If loadAnalytics is later wrapped in useCallback, bugs could appear
  - ESLint would flag this as a warning

- **Fix**:
  ```typescript
  useEffect(() => {
    // Inline the fetch logic to avoid dependency issues
    const loadAnalytics = async () => {
      try {
        setLoading(true);

        // Load book analytics
        const bookResponse = await fetch(`/api/analytics/book/${bookId}`);
        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          setBookAnalytics(bookData.analytics);
        }

        // Load chapter analytics
        const chaptersResponse = await fetch(`/api/analytics/book/${bookId}/chapters`);
        if (chaptersResponse.ok) {
          const chaptersData = await chaptersResponse.json();
          setChapterAnalytics(chaptersData.analytics || []);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [bookId]);

  // For reusability in handleAnalyzeBook, create a separate refresh function
  const refreshAnalytics = async () => {
    try {
      setLoading(true);

      const bookResponse = await fetch(`/api/analytics/book/${bookId}`);
      if (bookResponse.ok) {
        const bookData = await bookResponse.json();
        setBookAnalytics(bookData.analytics);
      }

      const chaptersResponse = await fetch(`/api/analytics/book/${bookId}/chapters`);
      if (chaptersResponse.ok) {
        const chaptersData = await chaptersResponse.json();
        setChapterAnalytics(chaptersData.analytics || []);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeBook = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/analytics/book/${bookId}/analyze`, {
        method: 'POST',
      });

      if (response.ok) {
        await refreshAnalytics();
        alert('Book analyzed successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error?.message || 'Failed to analyze'}`);
      }
    } catch (error) {
      console.error('Error analyzing book:', error);
      alert('Failed to analyze book');
    } finally {
      setAnalyzing(false);
    }
  };
  ```

---

## Good News: SQL Protection Working Correctly

### Routes Are Safe

**Finding**: All route files (`backend/src/routes/*.ts`) properly use parameterized statements with `?` placeholders. No template literal SQL injection found.

**Evidence**:
```typescript
// Example from routes - SAFE patterns
db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
db.prepare('UPDATE style_presets SET usage_count = usage_count + 1 WHERE id = ?').run(presetId);
db.prepare('INSERT INTO chapters (id, book_id, chapter_number) VALUES (?, ?, ?)').run(id, bookId, number);
```

**Checked Files** (24 routes):
- ✅ auth.ts
- ✅ projects.ts
- ✅ books.ts
- ✅ chapters.ts
- ✅ outlines.ts
- ✅ trilogy.ts
- ✅ universes.ts
- ✅ mysteries.ts
- ✅ reflections.ts
- ✅ lessons.ts
- ✅ presets.ts
- ✅ queue.ts
- ✅ progress.ts
- ✅ editing.ts
- ✅ prose-styles.ts
- ✅ genre-tropes.ts
- ✅ genre-conventions.ts
- ✅ regeneration.ts
- ✅ export.ts
- ✅ analytics.ts
- ✅ generation.ts
- ✅ saved-concepts.ts
- ✅ saved-concept-summaries.ts
- ✅ health.ts

All routes follow safe parameterized query patterns.

---

## Areas of Concern

### Pattern: useCallback + useEffect Dependencies

**Observation**: Multiple components use the anti-pattern of wrapping fetch functions in `useCallback` and then depending on that callback in `useEffect`.

**Why This Is Wrong**:
1. `useCallback` is for memoizing callbacks passed to child components
2. `useEffect` should inline its async operations
3. Creates unnecessary dependency tracking complexity
4. Risks infinite loops if state dependencies are added
5. Causes double renders on mount

**Found In**:
- `app/projects/[id]/plot/page.tsx` (fetchData)
- `app/projects/[id]/series/page.tsx` (fetchData)
- `app/components/ChapterEditor.tsx` (fetchChapterData)

**Correct Pattern**:
```typescript
// WRONG
const fetchData = useCallback(async () => {
  // fetch logic
}, [id]);

useEffect(() => {
  fetchData();
}, [fetchData]);

// RIGHT
useEffect(() => {
  const fetchData = async () => {
    // fetch logic
  };
  fetchData();
}, [id]);
```

### Pattern: Dynamic SQL Construction

**Observation**: The base repository uses string interpolation for column names and ORDER BY clauses. While currently only called with hardcoded values, this pattern is dangerous.

**Risk**: If any future code passes user input to repository methods, instant SQL injection.

**Current Calls** (all safe):
```typescript
// All these use hardcoded values (currently safe):
findBy('project_id', projectId, { orderBy: 'book_number ASC' });
findBy('user_id', userId);
findOneBy('email', email);
deleteBy('project_id', projectId);
```

**Future Risk**: Developer adds dynamic sorting:
```typescript
// DANGER - future code might do this:
const sortColumn = req.query.sort; // User input!
repository.findAll({ orderBy: sortColumn }); // SQL INJECTION!
```

**Recommendation**: Implement column whitelisting NOW before it becomes a problem.

---

## Bug Prevention Recommendations

### 1. React Hook Best Practices

**Enable ESLint Rule**:
```json
// .eslintrc.json
{
  "rules": {
    "react-hooks/exhaustive-deps": "error"
  }
}
```

**Training Points**:
1. **Never wrap useEffect fetches in useCallback** - Inline the function
2. **Only depend on primitive values** - Depend on `id`, not `fetchData`
3. **Use functional setState** - `setState(prev => prev + 1)` avoids stale closures
4. **useCallback is for child components** - Not for useEffect

**Code Review Checklist**:
- [ ] No useCallback wrapping useEffect functions
- [ ] useEffect dependencies are primitive values
- [ ] No functions in dependency arrays (except stable refs)
- [ ] Async functions are defined inline in useEffect

### 2. SQL Injection Prevention

**Mandatory Practices**:
1. **Column whitelisting** - Every repository defines allowed columns
2. **Validate ORDER BY** - Use regex + whitelist
3. **Never template literals for SQL** - Always use `?` placeholders
4. **Code review all SQL** - Second pair of eyes on every query

**Pre-commit Hook**:
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for template literal SQL
if git diff --cached | grep -E '\`(SELECT|INSERT|UPDATE|DELETE).*\$\{'; then
  echo "ERROR: Found template literal SQL (potential injection)"
  echo "Use parameterized queries with ? placeholders"
  exit 1
fi

# Check for dynamic column names without validation
if git diff --cached | grep -E 'WHERE \$\{|ORDER BY \$\{'; then
  echo "WARNING: Found dynamic SQL construction"
  echo "Ensure column names are validated against whitelist"
fi
```

### 3. TypeScript Strict Mode

**Enable Strict Checks**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 4. Build-Time Validation

**Add to CI/CD**:
```yaml
# .github/workflows/ci.yml
- name: Lint
  run: npm run lint

- name: Type Check
  run: npm run type-check

- name: Security Audit
  run: npm audit --audit-level=moderate
```

---

## Implementation Priority

### Phase 1: Immediate (Fix React Hooks)
**Estimated Time**: 2-4 hours
**Risk**: Medium (performance issues, potential bugs)

1. Fix BUG-009-B: Plot page useCallback loop
2. Fix BUG-009-C: Series page useCallback loop
3. Fix BUG-009-D: ChapterEditor useCallback loop
4. Fix BUG-009-E: AnalyticsDashboard missing dependency

**Files to Modify**:
- `app/projects/[id]/plot/page.tsx`
- `app/projects/[id]/series/page.tsx`
- `app/components/ChapterEditor.tsx`
- `app/components/AnalyticsDashboard.tsx`

### Phase 2: Critical (SQL Injection Protection)
**Estimated Time**: 4-6 hours
**Risk**: Critical (SQL injection, but currently not exploitable)

1. Fix BUG-009-A: Add column whitelisting to BaseRepository
2. Update all repository subclasses to define whitelists
3. Add validation tests

**Files to Modify**:
- `backend/src/repositories/base.repository.ts`
- `backend/src/repositories/projects.repository.ts`
- `backend/src/repositories/books.repository.ts`
- `backend/src/repositories/chapters.repository.ts`
- Add tests for validation

### Phase 3: Prevention (Tools & Rules)
**Estimated Time**: 1-2 hours
**Risk**: Low (preventive)

1. Enable ESLint exhaustive-deps rule
2. Add pre-commit hook for SQL pattern detection
3. Update developer documentation

**Files to Modify**:
- `.eslintrc.json`
- `.git/hooks/pre-commit`
- `docs/CONTRIBUTING.md`

---

## Files Analyzed

### Frontend (React Hooks)
Total: 33 TypeScript React files

**No Issues Found**:
- ✅ `app/components/GenerationProgress.tsx` - Clean hook usage
- ✅ `app/lib/progress-stream.ts` - Fixed in previous sprint
- ✅ `app/projects/page.tsx` - fetchProjects defined inline correctly
- ✅ `app/login/page.tsx` - No hooks
- ✅ `app/page.tsx` - Simple component
- ✅ `app/components/shared/LoadingState.tsx` - No hooks
- ✅ `app/components/ExportButtons.tsx` - Clean usage

**Issues Found**:
- ⚠️ `app/projects/[id]/plot/page.tsx` - **BUG-009-B**
- ⚠️ `app/projects/[id]/series/page.tsx` - **BUG-009-C**
- ⚠️ `app/components/ChapterEditor.tsx` - **BUG-009-D**
- ⚠️ `app/components/AnalyticsDashboard.tsx` - **BUG-009-E**

**Not Fully Analyzed** (file size limits):
- `app/components/GenrePreferenceForm.tsx` (31,606 tokens - too large)
- `app/projects/[id]/outline/page.tsx` (partial read only)

### Backend (SQL Injection)
Total: 24 route files, 4 repository files, 2 service files

**All Safe** (Parameterized Queries):
- ✅ All 24 route files use `db.prepare('... WHERE id = ?').run(value)` pattern
- ✅ No template literal SQL found in routes
- ✅ No string concatenation in WHERE/FROM/ORDER BY clauses

**Issue Found**:
- ⚠️ `backend/src/repositories/base.repository.ts` - **BUG-009-A**

**Repository Files Checked**:
- ✅ `base.repository.ts` (contains vulnerability)
- ✅ `projects.repository.ts` (uses base methods safely)
- ✅ `books.repository.ts` (uses base methods safely)
- ✅ `chapters.repository.ts` (uses base methods safely)

---

## Lessons Learned

### React Hook Dependencies

**Lesson**: The useCallback + useEffect dependency pattern is a common anti-pattern in React. It indicates:
1. Misunderstanding of useCallback's purpose (memoizing callbacks for child props)
2. Creating unnecessary dependency chain complexity
3. Potential for infinite loops

**Correct Pattern**:
- Inline async functions directly in useEffect
- Only depend on primitive values (IDs, strings, numbers)
- Use useCallback ONLY when passing callbacks to children

### SQL Injection Hunting

**Lesson**: Even when current code is safe, dangerous PATTERNS should be fixed:
1. Dynamic SQL construction is always risky
2. Whitelisting is the only safe approach for dynamic columns
3. Code review catches active bugs; pattern analysis prevents future bugs

**Search Patterns Used**:
```bash
# Found SQL injection patterns:
grep -r "ORDER BY.*\${" backend/
grep -r "WHERE.*\${" backend/
grep -r "`SELECT.*\${" backend/

# Verified parameterized queries:
grep -r ".prepare\(" backend/
grep -r "\.run\(.*?\)" backend/
```

---

## Summary

**Total Bugs**: 5
- **Critical SQL Injection Risk**: 1 (base repository - currently safe but dangerous pattern)
- **High Severity Hook Issues**: 3 (useCallback + useEffect loops)
- **Medium Severity Hook Issues**: 1 (missing dependency)

**Risk Assessment**:
- SQL injection: Low immediate risk (internal use only), High pattern risk
- React hooks: Medium immediate risk (performance), High maintenance risk

**Time to Fix**:
- React hooks: 2-4 hours
- SQL protection: 4-6 hours
- Prevention tools: 1-2 hours
- **Total: 7-12 hours**

**Recommended Order**:
1. Fix React Hook issues (user-facing performance)
2. Add SQL column whitelisting (security hardening)
3. Enable linting rules (prevent future issues)

---

**Report Generated**: 2026-01-25
**Bug Hunter**: Detective Ray Morrison
**Next Review**: After fixes implemented
