# Quick Security Reference Card

## SQL Injection Prevention - 1 Page Cheat Sheet

---

## 🚨 Red Flags - Stop and Review

```typescript
// ❌ DANGEROUS - DO NOT DO THIS
const query = `SELECT * FROM users WHERE id = '${userId}'`;
const query = `SELECT * FROM users WHERE name = ${userName}`;
const query = `DELETE FROM users WHERE id IN (${ids.join(',')})`;
const query = `SELECT * FROM users ORDER BY ${sortColumn}`;
const query = `SELECT * FROM users LIMIT ${limit}`;
```

**Why dangerous?** User input flows directly into SQL string. Attacker can inject arbitrary SQL.

**Attack example**: `userId = "1'; DROP TABLE users; --"`

---

## ✅ Safe Patterns - Copy These

### 1. Simple Query
```typescript
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(userId);
```

### 2. Multiple Parameters
```typescript
const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND status = ?');
const users = stmt.all(email, status);
```

### 3. IN Clause with Array
```typescript
// VALIDATE FIRST
const validIds = ids.map(id => {
  if (typeof id !== 'string' || !id) throw new Error('Invalid ID');
  return id;
});

// THEN USE
const placeholders = validIds.map(() => '?').join(',');
const stmt = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`);
const users = stmt.all(...validIds);
```

### 4. Dynamic Column (with whitelist)
```typescript
const ALLOWED_COLUMNS = ['id', 'name', 'email', 'created_at'];
if (!ALLOWED_COLUMNS.includes(column)) {
  throw new Error('Invalid column');
}
const stmt = db.prepare(`SELECT * FROM users ORDER BY ${column}`);
```

### 5. LIMIT/OFFSET
```typescript
const safeLimit = parseInt(String(limit), 10);
if (isNaN(safeLimit) || safeLimit < 0) throw new Error('Invalid limit');

const stmt = db.prepare('SELECT * FROM users LIMIT ? OFFSET ?');
const users = stmt.all(safeLimit, offset);
```

---

## 🛡️ Validation Functions

```typescript
// Column name (alphanumeric + underscore only)
const validateColumn = (col: string) => {
  if (!/^[a-zA-Z0-9_]+$/.test(col)) throw new Error('Invalid column');
};

// ORDER BY clause
const validateOrderBy = (orderBy: string) => {
  if (!/^[a-zA-Z0-9_]+(?: (?:ASC|DESC))?(?: ?, ?[a-zA-Z0-9_]+(?: (?:ASC|DESC))?)*$/.test(orderBy)) {
    throw new Error('Invalid ORDER BY');
  }
};

// UUID
const validateUUID = (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid UUID');
  }
};

// Number
const validateNumber = (val: any, name: string) => {
  const num = parseInt(String(val), 10);
  if (isNaN(num)) throw new Error(`Invalid ${name}`);
  return num;
};
```

---

## 🧪 Test with These Payloads

```typescript
// If any of these work, you have SQL injection
const maliciousInputs = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "1'; DELETE FROM users WHERE '1'='1",
  "admin'--",
  "1 UNION SELECT * FROM sqlite_master--"
];

// Expected behaviour: Should either be safely parameterised
// (no effect) or throw validation error
```

---

## 📋 Code Review Checklist

When reviewing SQL code, verify:

- [ ] No `${variable}` in SQL strings
- [ ] No `+` concatenation with user input
- [ ] All values use `?` placeholders
- [ ] Arrays validated before spreading
- [ ] Dynamic identifiers whitelisted
- [ ] LIMIT/OFFSET parameterised

---

## 🎯 Quick Decision Tree

**Is the SQL string built dynamically?**

└─ **No** → Safe (as long as using `?` for values)

└─ **Yes** → Is user input involved?

   └─ **No** → Probably safe

   └─ **Yes** → What's dynamic?

      ├─ **Values** → Use `?` placeholders ✅

      ├─ **Column names** → Whitelist validation required ✅

      ├─ **Table names** → Whitelist validation required ✅

      ├─ **ORDER BY** → Whitelist validation required ✅

      └─ **LIMIT/OFFSET** → Parameterise with `?` ✅

---

## 🚀 BaseRepository Helpers

If extending `BaseRepository`, use these:

```typescript
this.validateColumnName(column);    // Validates column names
this.validateOrderBy(orderBy);      // Validates ORDER BY clause
this.validateNumber(limit, 'LIMIT'); // Validates and coerces numbers
```

---

## 💡 Remember

**"When in doubt, parameterise!"**

- User input should NEVER appear directly in SQL strings
- Always use `?` placeholders for values
- Always whitelist dynamic identifiers
- Always validate array contents before spreading
- Test with malicious input

---

## 📞 Get Help

Unsure if code is safe? Ask:

1. Can an attacker control this value?
2. Does it flow into a SQL string without validation?
3. Would a malicious value break the query or cause side effects?

If yes to any: **Fix it before merging.**

---

**Full Guide**: See `.claude/security/SQL_INJECTION_PREVENTION.md`
**Bug Report**: See `SECURITY_FIX_BUG010.md`
