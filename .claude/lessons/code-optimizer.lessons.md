# Code Optimizer Lessons Learned

<!--
This file contains lessons specific to code optimization and performance engineering.
Format: Each lesson includes context, what was learned, application score, and tags.
-->

## Summary Statistics

- **Total lessons recorded**: 10
- **Last updated**: 2026-01-25
- **Foundational lessons** (score >= 5): 5
- **Project**: NovelForge Code Quality & Optimization

---

## Foundational Lessons (Score >= 5)

### 2026-01-25 | TypeScript noImplicitAny Must Be Enabled

**Context**: Enabling strict TypeScript in NovelForge backend (74 files with `any`)

**Lesson**: `noImplicitAny: false` defeats the purpose of TypeScript. Pattern:
1. Developers leave it disabled "to move fast"
2. `any` types proliferate (74 files in this project)
3. Type safety is lost - runtime errors that should be compile-time errors
4. Refactoring becomes dangerous

**Why Enable It**:
- Catches bugs at compile time instead of production
- Better IDE autocomplete and refactoring
- Forces proper error handling (no `catch (error: any)`)
- Documents expected types for future developers

**Migration Strategy**:
```typescript
// Bad pattern found everywhere
catch (error: any) {
  logger.error({ error: error.message }, 'Context');
}

// Good pattern after strict mode
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error({ error: errorMessage }, 'Context');
}
```

**Results**: All 74 files now compile with `noImplicitAny: true`. Found 111 error handlers that lost type safety.

**Application Score**: 10

**Tags**: #typescript #type-safety #noImplicitAny #strictMode #errorHandling

---

### 2026-01-25 | Server-Side Validation Is Non-Optional

**Context**: NovelForge API had manual validation (`if (!field)`)

**Lesson**: **Client validation is UX. Server validation is security.** Use schema libraries (Zod, Yup, Joi):
1. Manual validation is error-prone and inconsistent
2. DevTools can bypass client validation entirely
3. Direct API calls skip UI validation
4. Type-unsafe validation (`any` types) defeats TypeScript

**Why Zod Specifically**:
- Type inference: `z.infer<typeof schema>` gives TypeScript types for free
- Composable: Build complex schemas from simple ones
- Great error messages: Helps users fix validation errors
- Integration: Works with TypeScript, Express, tRPC, etc.

**Pattern**:
```typescript
// Before: Manual, unsafe, no types
if (!req.body.title || !req.body.projectId) {
  return res.status(400).json({ error: 'Missing fields' });
}

// After: Schema-validated, type-safe
const createBookSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
});

const validation = validateRequest(createBookSchema, req.body);
if (!validation.success) {
  return res.status(400).json({ error: validation.error });
}
// validation.data is now typed!
```

**Application Score**: 10

**Tags**: #validation #zod #security #api #input-validation

---

## Foundational Lessons (Score >= 5) - Continued

### 2026-01-25 | Toast Timer Pattern - Common Memory Leak

**Context**: Analyzing NovelForge frontend for memory leaks

**Lesson**: Toast/notification components are a **common source of memory leaks**. Pattern:
1. Component calls `setTimeout` to auto-dismiss notification
2. User navigates away before timeout fires
3. Timeout still fires, calling setState on unmounted component
4. Memory leak accumulates with each toast

**Solution Pattern**:
```typescript
const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

// Store timeout ID
const timeoutId = setTimeout(() => action(), duration);
timeoutRefs.current.set(id, timeoutId);

// Cleanup on unmount
useEffect(() => {
  return () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  };
}, []);
```

**Application Score**: 10

**Tags**: #memory-leaks #react #setTimeout #notifications #cleanup

---

### 2026-01-25 | Code Splitting ROI - Focus on Route-Specific Components

**Context**: Bundle optimization for NovelForge

**Lesson**: Best ROI for code splitting:
1. **Route-specific** components (editor, dashboard) - used by <10% of routes
2. **Conditionally rendered** components (modals, dialogs) - not always shown
3. **Heavy** components (>500 lines, complex logic, large deps)

**Don't split**:
- Shared components used across most pages
- Small components (<100 lines)
- Layout components
- Error boundaries

**Results**: 15-20 kB savings by splitting 4 components. Shared bundle stayed same size (good).

**Application Score**: 9

**Tags**: #code-splitting #next.js #dynamic-import #bundle-size #performance

---

### 2026-01-25 | Memory Leak Audit Pattern

**Context**: Systematic review of React components

**Lesson**: Memory leak audit checklist:
1. Search for `setTimeout` and `setInterval` - do they have cleanup?
2. Search for `addEventListener` - is there `removeEventListener`?
3. Search for `new EventSource` or `new WebSocket` - is `.close()` called?
4. Search for `useEffect` with async functions - are they aborted?
5. Search for subscriptions - are they unsubscribed?

**Common safe patterns**:
- Component redirects immediately (setTimeout for redirect is safe)
- Interval has cleanup: `useEffect(() => { const id = setInterval(...); return () => clearInterval(id); }, [])`
- Event listener has cleanup: `useEffect(() => { document.addEventListener(...); return () => document.removeEventListener(...); }, [])`

**Application Score**: 8

**Tags**: #memory-leaks #react #useEffect #cleanup #audit

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Next.js Dynamic Import Performance

**Context**: Implementing lazy loading for heavy components

**Lesson**: `next/dynamic` best practices:
- Use `ssr: false` for client-only components (editors, dashboards)
- Always provide a `loading` fallback (improves perceived performance)
- Don't lazy load components in the critical render path
- Lazy load heavy components that are route-specific

**Gotcha**: Adding `loading` component slightly increases bundle (wrapping code), but worth it for UX.

**Application Score**: 7

**Tags**: #next.js #lazy-loading #dynamic-import #ssr

---

### 2026-01-25 | Bundle Analysis Before/After Discipline

**Context**: Verifying optimization impact

**Lesson**: Always run build before AND after optimizations:
1. **Before**: `npm run build` → capture baseline metrics
2. **Make changes**
3. **After**: `npm run build` → compare results
4. **Analyze**: `ANALYZE=true npm run build` → visualize what changed

**Why**: Without baseline, you can't prove optimization worked. Bundle analyzer shows if you accidentally increased size elsewhere.

**Application Score**: 6

**Tags**: #bundle-analysis #verification #metrics #webpack

---

### 2026-01-25 | Static Styles Pattern

**Context**: Analyzing inline styles in components

**Lesson**: Inline styles defined inside component functions create new object references on every render, preventing React optimization.

**Good**:
```typescript
const STATIC_STYLES = { container: {...} }; // Outside component

function Component() {
  return <div style={STATIC_STYLES.container} />;
}
```

**Bad**:
```typescript
function Component() {
  const styles = { container: {...} }; // New object every render
  return <div style={styles.container} />;
}
```

**Trade-off**: Only static styles benefit. Dynamic styles (based on props/state) must stay inline.

**Application Score**: 5

**Tags**: #react #performance #styles #optimization #rendering

---

### 2026-01-25 | Console.log Production Removal

**Context**: Next.js production optimization

**Lesson**: Use Next.js compiler options to remove console statements in production:

```javascript
compiler: {
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'],
  } : false,
}
```

Keeps error/warn for debugging, removes info/debug/log for performance and bundle size.

**Application Score**: 4

**Tags**: #next.js #production #console #bundle-size

---

## Pattern Library

### Memory Leak Fix - setTimeout/setInterval with Cleanup

```typescript
// BAD - Memory leak
useEffect(() => {
  setTimeout(() => doSomething(), 1000);
}, []);

// GOOD - Cleanup if unmounted
useEffect(() => {
  const id = setTimeout(() => doSomething(), 1000);
  return () => clearTimeout(id);
}, []);

// BEST - For multiple timeouts (like Toasts)
const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

const scheduleAction = (id: string, action: () => void, delay: number) => {
  const timeoutId = setTimeout(() => {
    action();
    timeoutRefs.current.delete(id);
  }, delay);
  timeoutRefs.current.set(id, timeoutId);
};

useEffect(() => {
  return () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  };
}, []);
```

### Code Splitting Pattern - Next.js Dynamic Import

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingFallback />,
  ssr: false, // Client-only if needed
});

export default function Page() {
  return <HeavyComponent />;
}
```

### Interval Ref Pattern - Avoid Stale Closures

```typescript
// GOOD - Latest function always called
const fetchDataRef = useRef(fetchData);
fetchDataRef.current = fetchData;

useEffect(() => {
  fetchDataRef.current(); // Initial call
  const interval = setInterval(() => fetchDataRef.current(), 5000);
  return () => clearInterval(interval);
}, []); // Safe empty deps
```

---

## Anti-Patterns Observed

### Anti-Pattern 1: Premature Optimization
**Observed**: Thinking about optimizing small components (<100 lines)
**Why Bad**: Development time > performance gain
**Fix**: Profile first, optimize only hot paths

### Anti-Pattern 2: Lazy Loading Everything
**Observed**: Tendency to lazy load all components
**Why Bad**: Adds complexity, can make initial load slower (extra chunks to fetch)
**Fix**: Only lazy load route-specific or conditionally rendered components

### Anti-Pattern 3: Ignoring Cleanup
**Observed**: 1/8 components had missing cleanup (Toast)
**Why Bad**: Memory leaks accumulate over time, hard to debug
**Fix**: Always ask "what if this component unmounts?" for every effect

---

## Measurement Techniques

### Bundle Size Analysis
```bash
# Before changes
npm run build > build-before.txt

# After changes
npm run build > build-after.txt

# Visual analysis
ANALYZE=true npm run build
```

### Memory Leak Detection
1. Chrome DevTools > Memory > Take heap snapshot
2. Navigate around app (5-10 page changes)
3. Take another heap snapshot
4. Compare - look for:
   - Detached DOM nodes
   - Growing event listener counts
   - Retained timers/intervals

### Performance Profiling
1. React DevTools > Profiler
2. Record interaction
3. Look for:
   - Unnecessary re-renders
   - Long render times
   - Expensive component updates

---

## Benchmarks (NovelForge)

- **Good**: 87-100 kB shared bundle for Next.js 14 app
- **Good**: <5 kB per route-specific code
- **Excellent**: All cleanup functions present (100%)
- **Target**: <100ms time to interactive (TTI)

---

## Tools Used

1. **@next/bundle-analyzer** - Visualize webpack bundles
2. **next/dynamic** - Code splitting
3. **Chrome DevTools Memory** - Detect leaks
4. **React DevTools Profiler** - Component performance
5. **grep/ripgrep** - Find patterns (setTimeout, addEventListener, etc.)

---

## Key Insights

1. **Most React codebases have memory leaks** - Usually in timers/events (87.5% had proper cleanup before audit)
2. **Code splitting has diminishing returns** - Focus on largest components first
3. **Always measure** - Baseline → Change → Measure → Verify
4. **Cleanup is not optional** - Even if React 18 handles it better, it's still wrong
5. **Production config matters** - Console removal, minification, source maps all impact performance

---

## Future Areas to Explore

1. **Virtual scrolling** - For large lists (100+ items)
2. **Service workers** - Offline support, caching
3. **Web Vitals** - Real user monitoring
4. **Concurrent rendering** - React 18+ features
5. **CSS-in-JS performance** - styled-components vs inline vs modules

---

### 2026-01-25 | Inline Styles Performance Pattern

**Context**: Optimizing NovelForge landing page with 15+ inline style objects

**Lesson**: Inline styles inside component functions create **new object references on every render**, preventing React optimization (memo, PureComponent).

**Performance Impact**:
- Every render creates new objects
- React can't use reference equality to skip re-renders
- Wastes memory (garbage collection overhead)
- Minor on simple pages, major on complex dashboards

**Pattern**:
```typescript
// BAD - New object every render
function Component() {
  return <div style={{ padding: '1rem', color: '#333' }} />;
}

// GOOD - Stable reference
const STYLES = {
  container: { padding: '1rem', color: '#333' } as const,
};

function Component() {
  return <div style={STYLES.container} />;
}
```

**When It Matters**:
- Components that re-render frequently (dashboards, lists)
- Large style objects (10+ properties)
- Pages with many components (>20)

**When It Doesn't Matter**:
- Root layout (renders once)
- Error pages (rarely rendered)
- Dynamic styles (must change with props/state)

**Application Score**: 7

**Tags**: #react #performance #styles #optimization #rendering

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Database Parameter Type Safety

**Context**: Fixing `params: any[]` in database query code

**Lesson**: Database query parameters should have proper union types, not `any[]`.

**Pattern**:
```typescript
// Before
const params: any[] = [];
params.push(title, projectId, bookNumber);

// After
const params: (string | number | null)[] = [];
params.push(title, projectId, bookNumber);
```

**Why**:
- Catches type mismatches at compile time
- Documents expected parameter types
- Prevents SQL type coercion bugs

**Application Score**: 6

**Tags**: #typescript #database #type-safety #sql

---

### 2026-01-25 | Zod Schema Organization

**Context**: Creating centralized validation schemas for NovelForge

**Lesson**: Keep all Zod schemas in a central file (`utils/schemas.ts`) instead of scattered across routes.

**Benefits**:
1. Reusable across routes and tests
2. Single source of truth for validation rules
3. Easy to update validation logic project-wide
4. Generated TypeScript types from schemas

**Pattern**:
```typescript
// utils/schemas.ts
export const createBookSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
});

// Type inference for free!
export type CreateBookRequest = z.infer<typeof createBookSchema>;
```

**Gotcha**: Remember to export helper functions like `validateRequest()` for DRY.

**Application Score**: 8

**Tags**: #zod #validation #organization #type-safety

---

