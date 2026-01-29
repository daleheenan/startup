# Navigation and User Preferences Fixes

## Date: 2026-01-29

## Issue Summary

The application was experiencing three critical issues:

1. **500 Error on `/api/user-settings/preferences`** - Database schema mismatch
2. **404 Error on PWA icons** - Missing PNG icons referenced in manifest
3. **Navigation clicks not working** - Standalone navigation items using regular `<a>` tags instead of Next.js `Link`

---

## Fix 1: Database Schema - User Preferences Table

### Problem
The `user_preferences` table in `schema.sql` was missing the `show_ai_costs_menu` column that was added in migration `051_ai_request_log.sql`. This caused a 500 error when the backend tried to query this column.

### Solution
Updated `backend/src/db/schema.sql` to include the `show_ai_costs_menu` column:

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY DEFAULT 'owner',
  prose_style TEXT,  -- JSON: Default prose style settings for new projects
  show_ai_costs_menu INTEGER DEFAULT 0,  -- Toggle for displaying AI Costs menu item
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Files Modified
- `backend/src/db/schema.sql`

### Impact
- Resolves 500 error on GET `/api/user-settings/preferences`
- Ensures schema consistency between base schema and migrations
- Enables the AI Costs menu toggle feature

---

## Fix 2: PWA Icons - Missing PNG Files

### Problem
The `manifest.json` referenced multiple PNG icons (72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512) but only an SVG icon existed at `public/icons/icon.svg`. This caused 404 errors for all PNG icon requests.

### Solution
Updated `public/manifest.json` to use the existing SVG icon instead of non-existent PNG files:

```json
"icons": [
  {
    "src": "/icons/icon.svg",
    "sizes": "any",
    "type": "image/svg+xml",
    "purpose": "any maskable"
  }
]
```

### Files Modified
- `public/manifest.json`

### Impact
- Eliminates 404 errors for PWA icons
- SVG provides better scalability than multiple PNG files
- Reduces maintenance burden (single icon file instead of 8)

### Future Enhancement
For production, consider generating PNG icons at various sizes for better browser compatibility using a tool like `sharp` or an online icon generator.

---

## Fix 3: Navigation - Client-Side Routing

### Problem
Standalone navigation items in `SidebarNavGroup.tsx` were using regular HTML `<a>` tags instead of Next.js `Link` components. This caused full page reloads instead of client-side navigation, breaking the SPA experience and causing clicks to appear to "do nothing" (actually doing full reloads).

### Root Cause
Line 169 in `SidebarNavGroup.tsx`:
```tsx
<a href={href} style={standaloneStyle}>
```

### Solution
Replaced the `<a>` tag with Next.js `Link` component:

```tsx
import Link from 'next/link';

// In standalone mode:
<Link href={href} style={standaloneStyle}>
  <span style={iconWrapperStyle}>{icon}</span>
  <span style={{ ...labelStyle, textTransform: 'none', fontSize: '0.875rem', letterSpacing: 'normal' }}>
    {label}
  </span>
</Link>
```

### Files Modified
- `app/components/dashboard/Sidebar/SidebarNavGroup.tsx`

### Impact
- Enables proper client-side navigation
- Prevents unnecessary page reloads
- Maintains application state during navigation
- Improves user experience with instant navigation

---

## Testing

### Backend Tests
Created comprehensive test coverage in `backend/src/routes/__tests__/user-settings.test.ts`:

- ✅ GET preferences with `show_ai_costs_menu` column
- ✅ Handle missing `show_ai_costs_menu` gracefully
- ✅ Convert database integer (0/1) to boolean (true/false)
- ✅ Cache integration
- ✅ PATCH preferences to create/update rows
- ✅ Database error handling
- ✅ Schema compatibility with NULL/undefined values
- ✅ JSON parsing for `prose_style` field

**Coverage:** 280+ lines of comprehensive tests

### Frontend Tests
Created test coverage in `app/components/dashboard/Sidebar/__tests__/SidebarNavGroup.test.tsx`:

- ✅ Standalone mode renders with Link component
- ✅ Client-side navigation without page reload
- ✅ Active state styling
- ✅ Collapsible group functionality
- ✅ Child items use Link components
- ✅ Regression tests for navigation bug

**Coverage:** 200+ lines of tests

### Build Verification
- ✅ Backend builds without errors (`npm run build`)
- ✅ Frontend builds without errors (`npm run build`)
- ✅ TypeScript compilation passes
- ✅ All existing tests pass

---

## Verification Steps

1. **Database Schema:**
   ```bash
   sqlite3 backend/novelforge.db
   .schema user_preferences
   # Should show show_ai_costs_menu INTEGER DEFAULT 0
   ```

2. **PWA Icons:**
   - Navigate to: `http://localhost:3000/icons/icon.svg`
   - Should load successfully
   - Check manifest: `http://localhost:3000/manifest.json`
   - Should reference SVG icon only

3. **Navigation:**
   - Click "Dashboard" in sidebar
   - Should navigate without page reload
   - Check Network tab: no full page requests
   - Click "Settings" in sidebar
   - Should navigate instantly

4. **User Preferences API:**
   ```bash
   curl http://localhost:3001/api/user-settings/preferences
   # Should return 200 with showAICostsMenu field
   ```

---

## Deployment Considerations

### Database Migration
The `show_ai_costs_menu` column is added by migration `051_ai_request_log.sql`. Ensure:
- Migration 051 has been applied to production database
- If using a fresh database, the updated `schema.sql` will include the column

### Cache Invalidation
After deploying, consider clearing the user preferences cache:
- Cache key: `user-preferences:owner`
- TTL: 1800 seconds (30 minutes)

### PWA Updates
Browsers may cache the old `manifest.json`. Users may need to:
- Clear browser cache
- Uninstall and reinstall PWA
- Wait for service worker update cycle

---

## Related Files

### Modified
- `backend/src/db/schema.sql`
- `public/manifest.json`
- `app/components/dashboard/Sidebar/SidebarNavGroup.tsx`

### Created
- `backend/src/routes/__tests__/user-settings.test.ts`
- `app/components/dashboard/Sidebar/__tests__/SidebarNavGroup.test.tsx`
- `docs/fixes/navigation-and-preferences-fixes.md` (this file)

### Referenced
- `backend/src/db/migrations/051_ai_request_log.sql`
- `backend/src/routes/user-settings.ts`
- `app/components/dashboard/Sidebar/SidebarNavItem.tsx`

---

## Lessons Learned

1. **Schema Synchronisation:** Always ensure base `schema.sql` stays in sync with migrations
2. **Icon Management:** SVG icons provide better flexibility than multiple PNG files
3. **Next.js Links:** Always use `Link` component for internal navigation in Next.js
4. **Testing:** Comprehensive tests prevent regressions and document expected behaviour
5. **Documentation:** Clear fix documentation helps future debugging and knowledge transfer

---

## Author
Project Director Agent (Dale Heenan persona)

## Review Status
- Code Review: ✅ Self-reviewed
- Test Coverage: ✅ Comprehensive
- Build Verification: ✅ Passed
- Documentation: ✅ Complete
