# SQL Injection Prevention Guide

## For Developers

This guide explains how to write SQL queries safely in this codebase to prevent SQL injection vulnerabilities.

---

## Golden Rules

### ✅ ALWAYS DO

1. **Use parameterised queries**
   ```typescript
   // GOOD
   const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
   const user = stmt.get(userId);
   ```

2. **Validate array inputs before spreading**
   ```typescript
   // GOOD
   const validatedIds = ids.map(id => {
     if (typeof id !== 'string' || id.length === 0) {
       throw new Error('Invalid ID');
     }
     return id;
   });
   const placeholders = validatedIds.map(() => '?').join(',');
   const stmt = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`);
   const users = stmt.all(...validatedIds);
   ```

3. **Validate dynamic column names**
   ```typescript
   // GOOD
   const validateColumn = (col: string) => {
     if (!/^[a-zA-Z0-9_]+$/.test(col)) {
       throw new Error('Invalid column name');
     }
   };
   validateColumn(columnName);
   const stmt = db.prepare(`SELECT * FROM users ORDER BY ${columnName}`);
   ```

4. **Parameterise LIMIT and OFFSET**
   ```typescript
   // GOOD
   const safeLimit = parseInt(String(limit), 10);
   if (isNaN(safeLimit) || safeLimit < 0) {
     throw new Error('Invalid limit');
   }
   const stmt = db.prepare('SELECT * FROM users LIMIT ?');
   const users = stmt.all(safeLimit);
   ```

---

### ❌ NEVER DO

1. **String concatenation with user input**
   ```typescript
   // BAD - SQL INJECTION RISK
   const query = `SELECT * FROM users WHERE id = '${userId}'`;
   db.prepare(query).all();
   ```

2. **Template literals with user input**
   ```typescript
   // BAD - SQL INJECTION RISK
   const query = `SELECT * FROM users WHERE name = '${userName}'`;
   db.prepare(query).all();
   ```

3. **Unvalidated arrays in IN clauses**
   ```typescript
   // BAD - SQL INJECTION RISK
   const placeholders = userIds.map(() => '?').join(',');
   const query = `SELECT * FROM users WHERE id IN (${placeholders})`;
   db.prepare(query).all(...userIds); // userIds not validated
   ```

4. **Dynamic column names without validation**
   ```typescript
   // BAD - SQL INJECTION RISK
   const query = `SELECT * FROM users ORDER BY ${userColumn}`;
   db.prepare(query).all();
   ```

5. **Interpolated LIMIT/OFFSET**
   ```typescript
   // BAD - SQL INJECTION RISK
   const query = `SELECT * FROM users LIMIT ${limit} OFFSET ${offset}`;
   db.prepare(query).all();
   ```

---

## Common Patterns

### Pattern 1: Simple Query with Parameters

```typescript
// ✅ CORRECT
const getUserById = (id: string) => {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
};
```

### Pattern 2: IN Clause with Array

```typescript
// ✅ CORRECT
const getUsersByIds = (ids: string[]) => {
  // 1. Validate array contents
  const validatedIds = ids.map(id => {
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('Invalid user ID');
    }
    return id;
  });

  // 2. Create placeholders
  const placeholders = validatedIds.map(() => '?').join(',');

  // 3. Use parameterised query
  const stmt = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`);
  return stmt.all(...validatedIds);
};
```

### Pattern 3: Dynamic Column with Whitelist

```typescript
// ✅ CORRECT
const getUsersSorted = (orderBy: string) => {
  // 1. Whitelist allowed columns
  const allowedColumns = ['id', 'name', 'email', 'created_at'];
  if (!allowedColumns.includes(orderBy)) {
    throw new Error('Invalid order column');
  }

  // 2. Safe to use in query
  const stmt = db.prepare(`SELECT * FROM users ORDER BY ${orderBy}`);
  return stmt.all();
};
```

### Pattern 4: Pagination with LIMIT/OFFSET

```typescript
// ✅ CORRECT
const getUsersPaginated = (page: number, pageSize: number) => {
  // 1. Validate and coerce numbers
  const safePageSize = parseInt(String(pageSize), 10);
  const safePage = parseInt(String(page), 10);

  if (isNaN(safePageSize) || safePageSize < 1) {
    throw new Error('Invalid page size');
  }
  if (isNaN(safePage) || safePage < 1) {
    throw new Error('Invalid page number');
  }

  const offset = (safePage - 1) * safePageSize;

  // 2. Use parameterised LIMIT/OFFSET
  const stmt = db.prepare('SELECT * FROM users LIMIT ? OFFSET ?');
  return stmt.all(safePageSize, offset);
};
```

### Pattern 5: Complex Filters

```typescript
// ✅ CORRECT
const searchUsers = (filters: { name?: string; email?: string; status?: string }) => {
  let sql = 'SELECT * FROM users WHERE 1=1';
  const params: any[] = [];

  if (filters.name) {
    sql += ' AND name LIKE ?';
    params.push(`%${filters.name}%`);
  }

  if (filters.email) {
    sql += ' AND email = ?';
    params.push(filters.email);
  }

  if (filters.status) {
    // Whitelist status values
    const allowedStatuses = ['active', 'inactive', 'pending'];
    if (!allowedStatuses.includes(filters.status)) {
      throw new Error('Invalid status');
    }
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  const stmt = db.prepare(sql);
  return stmt.all(...params);
};
```

---

## BaseRepository Usage

When extending `BaseRepository`, use the validation methods:

```typescript
class UsersRepository extends BaseRepository<User> {
  findByCustomColumn(columnName: string, value: any): User[] {
    // ✅ Validate column name
    this.validateColumnName(columnName);

    // Safe to use now
    const sql = `SELECT * FROM users WHERE ${columnName} = ?`;
    return this.executeQuery(sql, [value]);
  }

  findAllSorted(orderBy: string, limit: number): User[] {
    // ✅ Validate ORDER BY
    this.validateOrderBy(orderBy);

    // ✅ Validate number
    const safeLimit = this.validateNumber(limit, 'LIMIT');

    return this.findAll({ orderBy, limit: safeLimit });
  }
}
```

---

## Validation Helpers

### Available in BaseRepository

```typescript
// Validates column names (alphanumeric + underscore only)
protected validateColumnName(column: string): void

// Validates ORDER BY clause (column names, ASC/DESC, commas)
protected validateOrderBy(orderBy: string): void

// Validates and coerces numbers (for LIMIT/OFFSET)
protected validateNumber(value: number, context: string): number
```

### Custom Validators

```typescript
// UUID validation
const validateUUID = (id: string): void => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid UUID');
  }
};

// Email validation
const validateEmail = (email: string): void => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email');
  }
};

// Enum validation
const validateStatus = (status: string): void => {
  const allowedStatuses = ['active', 'inactive', 'pending'];
  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid status');
  }
};
```

---

## Testing for SQL Injection

### Manual Testing

Always test with these payloads:

```typescript
// Basic injection
"'; DROP TABLE users; --"

// Union-based
"' UNION SELECT * FROM sqlite_master; --"

// Boolean-based
"' OR '1'='1"

// Comment-based
"'/**/OR/**/1=1--"
```

### Automated Testing

```typescript
describe('SQL Injection Prevention', () => {
  it('should reject malicious input in user IDs', () => {
    const maliciousId = "'; DROP TABLE users; --";

    expect(() => {
      getUserById(maliciousId);
    }).not.toThrow(); // Should handle safely via parameterisation

    // Verify no side effects
    const usersCount = db.prepare('SELECT COUNT(*) FROM users').get();
    expect(usersCount).toBeGreaterThan(0); // Table still exists
  });

  it('should reject malicious column names', () => {
    const maliciousColumn = "id; DROP TABLE users; --";

    expect(() => {
      getUsersSorted(maliciousColumn);
    }).toThrow('Invalid'); // Should throw validation error
  });
});
```

---

## Code Review Checklist

When reviewing SQL-related code, check:

- [ ] No template literals with user input in SQL
- [ ] No string concatenation with user input in SQL
- [ ] All dynamic identifiers (columns, tables) are validated
- [ ] All arrays are validated before spreading into parameters
- [ ] LIMIT and OFFSET are parameterised
- [ ] ORDER BY clauses are validated or whitelisted
- [ ] No raw SQL execution with user input
- [ ] All prepared statements use `?` placeholders

---

## Resources

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [SQLite Security Best Practices](https://www.sqlite.org/security.html)

---

## Questions?

If you're unsure whether your SQL query is safe:

1. Check if any user input reaches the SQL string
2. Verify all inputs are parameterised with `?`
3. Validate dynamic identifiers (columns, ORDER BY)
4. Test with malicious payloads
5. Ask for security review

**Remember**: When in doubt, parameterise!
