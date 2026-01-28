# NovelForge UX & Design Review Report V2

**Date:** 27 January 2026
**Reviewer:** UX Design Specialist
**Application:** NovelForge - Novel Writing/Creation Application
**Review Scope:** Comprehensive UX audit of navigation, workflows, and visual design

---

## Executive Summary

**Overall UX Score: 7.5/10**

NovelForge demonstrates solid UX fundamentals with a clear workflow structure, consistent design system implementation, and good accessibility practices. The application successfully guides users through a complex novel creation process with clear navigation states and workflow indicators. However, there are opportunities to improve consistency, reduce cognitive load, and enhance mobile responsiveness.

**Key Strengths:**
- Comprehensive design token system with WCAG AA compliance
- Clear workflow status indicators with locked/unlocked states
- Consistent navigation structure across project pages
- Well-implemented mobile navigation with hamburger menu
- Strong visual hierarchy using brand gradient (#667eea to #764ba2)

**Critical Issues:**
- Inconsistent layout patterns between pages (some use PageLayout, others custom layouts)
- Desktop sidebar navigation missing (MobileNavigation only)
- Inconsistent spacing and component sizing across sections
- Some text contrast issues for disabled states
- Modal/dialog accessibility could be improved

---

## 1. Primary Site Navigation Analysis

### 1.1 Desktop Navigation (PrimaryNavigationBar.tsx)

**STATUS: NOT FOUND**

**Issue #1: Missing Desktop Sidebar Navigation**
**Severity:** CRITICAL
**Location:** `app/components/PrimaryNavigationBar.tsx` (file does not exist)

The application appears to lack a dedicated desktop navigation component. The `MobileNavigation.tsx` component (lines 1-457) handles navigation but uses display:none on desktop (line 425-436), leaving no persistent navigation visible on larger screens.

**Current Behaviour:**
- Mobile: Hamburger menu with slide-out drawer (lines 269-289)
- Tablet/Desktop: Navigation hidden entirely (lines 424-436)

**Impact:**
- Desktop users have no visible way to navigate between Projects, New Project, and Settings
- Violates UX principle of "visibility of system status"
- Forces users to remember URLs or use browser back button

**Recommendation:** Create `PrimaryNavigationBar.tsx` for desktop with vertical sidebar layout (72px wide, matching current design pattern from World page line 209-236).

---

### 1.2 Mobile Navigation (MobileNavigation.tsx)

**Overall Assessment: 8/10**

**Strengths:**
✓ Touch-friendly targets (44px minimum, line 135-136)
✓ Keyboard accessible (Escape key closes drawer, lines 81-90)
✓ Proper ARIA labels (lines 132-133, 287-288)
✓ Prevents body scroll when open (lines 92-103)
✓ Smooth animations with reduced-motion support (lines 449-453)
✓ Online/offline status indicator (lines 203-224)

**Issues:**

**Issue #2: Hardcoded Navigation Items**
**Severity:** MEDIUM
**Location:** `app/components/MobileNavigation.tsx`, lines 14-46

Navigation items are hardcoded arrays rather than using a configuration file. This makes them difficult to maintain and extend.

**Recommendation:** Move to `app/lib/navigation-constants.ts` for consistency with ProjectNavigation pattern.

---

**Issue #3: Logo Accessibility**
**Severity:** LOW
**Location:** `app/components/MobileNavigation.tsx`, lines 173-201

The "N" logo link lacks descriptive text for screen readers.

```tsx
// Current (line 173-201)
<Link href="/" style={{...}}>
  <span style={{...}}>N</span>
  NovelForge
</Link>

// Recommended
<Link href="/" aria-label="NovelForge home page" style={{...}}>
  <span aria-hidden="true" style={{...}}>N</span>
  <span className="sr-only">NovelForge</span>
</Link>
```

---

**Issue #4: Offline Banner Position**
**Severity:** LOW
**Location:** `app/components/MobileNavigation.tsx`, lines 228-248

The offline banner has a fixed z-index (zIndex.header - 1, line 241) which may conflict with other fixed elements.

**Recommendation:** Use semantic z-index tokens consistently (e.g., `zIndex.notification`).

---

## 2. Edit Project Navigation Analysis

### 2.1 ProjectNavigation Component

**Overall Assessment: 8.5/10**

**Location:** `app/components/shared/ProjectNavigation.tsx`, lines 1-416

**Strengths:**
✓ Excellent workflow status system with colour-coded indicators (lines 186-197)
✓ Collapsible groups reduce cognitive load (lines 94-104)
✓ Clear locked/unlocked states with explanatory tooltips (lines 199-207)
✓ Auto-expands active group (lines 66-80)
✓ Proper ARIA attributes for accessibility (lines 247-250, 356-357)

**Navigation Structure:**
- Overview (standalone)
- Elements: Characters, World
- Story: Plot, Outline
- Novel: Chapters, Analytics, Follow-up
- Editorial: Editorial Board, Outline Review

---

**Issue #5: Status Colour Accessibility**
**Severity:** MEDIUM
**Location:** `app/components/shared/ProjectNavigation.tsx`, lines 186-197

Status colours rely solely on hue for differentiation, which fails for colour-blind users.

**Current Status Colours:**
- Active: `#667eea` (brand blue)
- Completed: `#10B981` (green)
- Required: `#EF4444` (red)
- Locked: `#94A3B8` (grey)

**Recommendation:** Add icons or patterns alongside colours:
```tsx
{status === 'completed' && <span aria-hidden="true">✓</span>}
{status === 'required' && <span aria-hidden="true">!</span>}
{status === 'locked' && <span aria-hidden="true">🔒</span>}
```

---

**Issue #6: Border-Only Indicators**
**Severity:** MEDIUM
**Location:** `app/components/shared/ProjectNavigation.tsx`, lines 228-229, 314

Tabs use subtle border colours (3px left border for nested, 2px bottom for standalone) which may be too subtle for users with low vision.

```tsx
// Nested tabs - line 228
borderLeft: `3px solid ${borderColor}`

// Standalone tabs - line 314
borderBottom: `3px solid ${tabBorderColor}`
```

**Recommendation:** Increase border width to 4px and add a subtle background tint for active states.

---

**Issue #7: Inconsistent Spacing**
**Severity:** LOW
**Location:** `app/components/shared/ProjectNavigation.tsx`

- Standalone tabs: padding '0.75rem 1rem' (line 313)
- Nested tabs (inactive): padding '0.5rem 1rem 0.5rem 2.5rem' (line 227)
- Group headers: padding '0.75rem 1rem' (line 342)

**Recommendation:** Use design tokens consistently (`spacing[3]`, `spacing[4]`, etc.) throughout.

---

**Issue #8: Dropdown Arrow Emoji**
**Severity:** LOW
**Location:** `app/components/shared/ProjectNavigation.tsx`, lines 363-372

Using text character '▼' for dropdown indicator rather than SVG icon.

**Recommendation:** Replace with proper chevron SVG for consistency and better rendering.

---

## 3. Edit Projects Workflow Analysis

### 3.1 Project Overview Page (`app/projects/[id]/page.tsx`)

**Overall Assessment: 8/10**

**Strengths:**
✓ Comprehensive status dashboard (lines 476-631)
✓ Clear next steps with conditional rendering (lines 1462-1565)
✓ Prominent story concept display (lines 1060-1224)
✓ Real-time job statistics (lines 502-618)
✓ Inline editing for book details with save/cancel (lines 661-858)

**Issues:**

**Issue #9: Confusing Generation Progress Layout**
**Severity:** MEDIUM
**Location:** `app/projects/[id]/page.tsx`, lines 875-1057

The generation progress indicator has complex nested states that overlap with the status update section, creating visual clutter.

**Recommendation:** Move generation progress to a modal overlay (use GenerationProgress component pattern).

---

**Issue #10: Next Steps Button Hierarchy**
**Severity:** MEDIUM
**Location:** `app/projects/[id]/page.tsx`, lines 1467-1565

All "Next Steps" buttons use gradient backgrounds, making it unclear which action is primary.

**Current:**
- Generate Characters: gradient (line 1473)
- Edit World: gradient OR grey (lines 1492-1493)
- Create Story Outline: different gradient (line 1513)
- Series Management: another different gradient (line 1532)

**Recommendation:** Use single primary action pattern:
- Primary (current next step): Brand gradient
- Secondary (completed steps): White with brand border
- Tertiary (future steps): Grey background

---

**Issue #11: Job Status Colours Without Context**
**Severity:** LOW
**Location:** `app/projects/[id]/page.tsx`, lines 510-561

Job statistics use colour-coded cards (brand, warning, success, error) without explanatory text initially visible.

**Recommendation:** Add aria-label or title attributes explaining each status.

---

### 3.2 Characters Page (`app/projects/[id]/characters/page.tsx`)

**Overall Assessment: 8.5/10**

**Strengths:**
✓ Excellent character filtering by nationality/ethnicity (lines 268-280, 367-412)
✓ Name regeneration with context preservation (lines 181-221)
✓ Auto-update toggle for dependent fields (lines 558-765)
✓ Name change confirmation with impact preview (lines 963-1056)
✓ Success messaging with propagation results (lines 157-169)

**Issues:**

**Issue #12: Filter Dropdowns Without Clear Button**
**Severity:** LOW
**Location:** `app/projects/[id]/characters/page.tsx`, lines 367-412

Nationality and ethnicity filters lack a "Clear filters" or "Show all" reset button.

**Recommendation:** Add reset button alongside filters.

---

**Issue #13: Regenerate All Names Confirmation**
**Severity:** LOW
**Location:** `app/projects/[id]/characters/page.tsx`, line 224

Uses browser's native `confirm()` dialog which is not styled consistently with app design.

**Recommendation:** Use ConfirmDialog component (as seen in outline page, lines 1390-1397).

---

**Issue #14: Character Editor Scroll Behaviour**
**Severity:** MEDIUM
**Location:** `app/projects/[id]/characters/page.tsx`, line 696

Character editor has maxHeight: '80vh' with overflow:auto (line 697), which can create a confusing double-scrollbar situation if the page itself is scrollable.

**Recommendation:** Use modal overlay pattern instead, or make editor take full viewport height.

---

### 3.3 World Page (`app/projects/[id]/world/page.tsx`)

**Overall Assessment: 7/10**

**Issues:**

**Issue #15: Inconsistent Layout Pattern**
**Severity:** HIGH
**Location:** `app/projects/[id]/world/page.tsx`, lines 202-444

World page uses custom layout with left sidebar (lines 209-236) instead of PageLayout component used elsewhere.

**Impact:**
- Inconsistent navigation position across pages
- Duplicated header markup (lines 241-273)
- Manual ProjectNavigation integration (lines 276-281)

**Recommendation:** Refactor to use PageLayout component consistently:
```tsx
<PageLayout
  title="World Building"
  subtitle="Create and edit locations, factions, and systems"
  backLink={`/projects/${projectId}`}
  backText="← Back to Project"
  projectNavigation={navigation}
>
  {/* content */}
</PageLayout>
```

---

**Issue #16: Element Type Icons Using Emojis**
**Severity:** LOW
**Location:** `app/projects/[id]/world/page.tsx`, lines 162-170

Uses emojis for type indicators (🗺️, ⚔️, ✨, 🔬) which may not render consistently across platforms.

**Recommendation:** Replace with SVG icons from a consistent icon library.

---

**Issue #17: Type Badge Not Editable**
**Severity:** MEDIUM
**Location:** `app/projects/[id]/world/page.tsx`, lines 538-552

World element type is displayed as read-only badge, but users might want to change classification (e.g., reclassify a location as a faction).

**Recommendation:** Make type editable with dropdown selector.

---

### 3.4 Plot Structure Page (`app/projects/[id]/plot/page.tsx`)

**Overall Assessment: 7.5/10**

**Strengths:**
✓ Wizard mode vs Advanced mode toggle (lines 920-952)
✓ Plot coherence validation (lines 849-917)
✓ Comprehensive plot layer management (lines 1047-1305)
✓ AI-generated field assistance (lines 390-428)
✓ Visual timeline representation (PlotLayersVisualization component)

**Issues:**

**Issue #18: Wizard Mode Always Shown First**
**Severity:** MEDIUM
**Location:** `app/projects/[id]/plot/page.tsx`, lines 186-194

Wizard mode becomes default whenever plot_layers.length === 0, even if user previously switched to advanced mode.

**Impact:**
- User preference not persisted
- Forces users to re-toggle every session

**Recommendation:** Store mode preference in localStorage and respect it.

---

**Issue #19: Act Structure Inputs Lack Validation**
**Severity:** MEDIUM
**Location:** `app/projects/[id]/plot/page.tsx`, lines 987-1043

Act structure chapter numbers (act_one_end, act_two_midpoint, etc.) allow invalid ranges (e.g., Act 2 ending before Act 1).

**Recommendation:** Add validation to ensure logical sequence:
```tsx
// Validate act_two_midpoint > act_one_end
// Validate act_two_end > act_two_midpoint
// Validate act_three_climax > act_two_end
```

---

**Issue #20: Layer Colour Picker Lacks Accessibility**
**Severity:** HIGH
**Location:** `app/projects/[id]/plot/page.tsx`, lines 1536-1553

Colour picker uses only visual colour swatches without labels, making it impossible for screen reader users to distinguish colours.

**Recommendation:** Add aria-label to each colour button:
```tsx
<button
  aria-label={`Select ${colorNames[color]} for plot layer`}
  onClick={() => setLayerForm({ ...layerForm, color })}
  // ...
/>
```

---

**Issue #21: Modal Overlay Z-Index**
**Severity:** LOW
**Location:** `app/projects/[id]/plot/page.tsx`, line 1452

Modal overlays use hardcoded z-index: 1000, which should use design token.

**Recommendation:** Use `zIndex.modal` from design tokens consistently.

---

### 3.5 Outline Page (`app/projects/[id]/outline/page.tsx`)

**Overall Assessment: 8/10**

**Strengths:**
✓ Comprehensive outline structure with acts and chapters (lines 1055-1369)
✓ Collapsible chapter details with scene cards (lines 1284-1365)
✓ Act management with edit/regenerate/delete actions (lines 1126-1267)
✓ Version prompting before overwriting chapters (lines 104-109, 1400-1407)
✓ Prerequisites check before outline generation (lines 748-778)

**Issues:**

**Issue #22: Outline Generation Timeout Message**
**Severity:** LOW
**Location:** `app/projects/[id]/outline/page.tsx`, line 331

Timeout error message specifies "15 minutes" but this seems excessive for outline generation. Users may assume the app has frozen.

**Recommendation:** Reduce timeout to 5-7 minutes and improve progress feedback granularity.

---

**Issue #23: Chapter Expansion Indicator**
**Severity:** LOW
**Location:** `app/projects/[id]/outline/page.tsx`, line 1313

Uses simple text arrow (▶ / ▼) for expand/collapse, which may not be clear.

**Recommendation:** Use chevron icon with rotation animation:
```tsx
<svg style={{
  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.2s'
}}>
  {/* chevron down icon */}
</svg>
```

---

**Issue #24: Scene Card Layout**
**Severity:** MEDIUM
**Location:** `app/projects/[id]/outline/page.tsx`, lines 1334-1362

Scene cards display all information (goal, conflict, outcome, emotion) at once, which becomes overwhelming for chapters with many scenes.

**Recommendation:** Truncate or show summary by default, with expand for full details.

---

**Issue #25: Act Editing Inline vs Modal Inconsistency**
**Severity:** LOW
**Location:** `app/projects/[id]/outline/page.tsx`, lines 1071-1122

Act editing happens inline (lines 1072-1101), while plot layer editing uses a modal (plot page, lines 1441-1611). This creates inconsistent interaction patterns.

**Recommendation:** Use modal pattern for all major edits for consistency.

---

### 3.6 Chapters Page (Chapter Management)

**STATUS:** Page file does not exist at expected location `app/projects/[id]/chapters/page.tsx`

**Issue #26: Missing Dedicated Chapters Page**
**Severity:** HIGH

The navigation includes a "Chapters" tab, but no corresponding page file was found. The ChapterEditor component exists but appears to be used inline or as a modal.

**Impact:**
- Broken navigation link
- Users cannot access chapter list view
- No way to browse/manage multiple chapters

**Recommendation:** Create `app/projects/[id]/chapters/page.tsx` with:
- Chapter list with status indicators
- Search/filter functionality
- Bulk actions (lock/unlock, delete)
- Chapter reordering
- Link to individual chapter editor

---

### 3.7 ChapterEditor Component

**Overall Assessment: 8/10**

**Location:** `app/components/ChapterEditor.tsx`, lines 1-571

**Strengths:**
✓ Edit mode toggle prevents accidental changes (lines 294-298)
✓ Lock/unlock protection from regeneration (lines 161-179)
✓ Text selection for regeneration with toolbar (lines 196-219, 373-381)
✓ Word count tracking (lines 92-95)
✓ Unsaved changes indicator (lines 357, 469-471)
✓ Edit notes for change documentation (lines 385-397)

**Issues:**

**Issue #27: Textarea Performance with Large Content**
**Severity:** MEDIUM
**Location:** `app/components/ChapterEditor.tsx`, lines 364-372

Using a single textarea for entire chapter content (min 500px, line 522) can cause performance issues with very long chapters (80,000+ words).

**Recommendation:** Consider implementing:
- Virtual scrolling for large content
- Paragraph-level editing blocks
- Lazy loading of content sections

---

**Issue #28: Find & Replace UX**
**Severity:** LOW
**Location:** `app/components/ChapterEditor.tsx`, lines 182-193

Find & replace uses browser prompt() dialogs which are not styled and don't show preview of changes.

**Recommendation:** Create dedicated Find & Replace modal with:
- Visual highlighting of matches
- Replace all vs replace one
- Case sensitivity toggle
- Undo functionality

---

**Issue #29: Regeneration Toolbar Position**
**Severity:** LOW
**Location:** `app/components/ChapterEditor.tsx`, lines 207-212

Toolbar position is hardcoded (top: 200, left: 50) rather than calculated from selection position.

**Recommendation:** Calculate actual position based on selection coordinates for better UX.

---

**Issue #30: Saving State Not Visually Distinct**
**Severity:** LOW
**Location:** `app/components/ChapterEditor.tsx`, lines 369-370

Saving state only shows opacity change and cursor change, which may not be noticeable.

**Recommendation:** Add visible "Saving..." indicator or toast notification.

---

## 4. Key Components Review

### 4.1 ExportButtons Component

**Overall Assessment: 8.5/10**

**Location:** `app/components/ExportButtons.tsx`, lines 1-250

**Strengths:**
✓ Clear hierarchy with "Read Your Book" primary action (lines 126-146)
✓ Proper ARIA labels and busy states (lines 151-152, 184-185, 217-218)
✓ Accessible focus states (lines 168-176, 201-209, 234-242)
✓ Min touch target height enforced (44px, lines 131, 154, 187, 220)

**Issues:**

**Issue #31: Error Handling with alert()**
**Severity:** MEDIUM
**Location:** `app/components/ExportButtons.tsx`, lines 43, 73, 103

All export errors use browser's native `alert()` which interrupts user flow and is not styled.

**Recommendation:** Use Toast component for error notifications (non-blocking, styled, dismissible).

---

**Issue #32: Loading State Without Progress**
**Severity:** LOW
**Location:** `app/components/ExportButtons.tsx`, lines 178, 210, 243

Export buttons show "Generating..." text but no progress indication for potentially long operations.

**Recommendation:** Add progress bar or spinner icon for exports longer than 3 seconds.

---

**Issue #33: Section Accessibility**
**Severity:** LOW
**Location:** `app/components/ExportButtons.tsx`, lines 110-118

Section uses `id="export"` and `aria-labelledby` but heading uses inline styles making it hard to find with screen reader navigation.

**Recommendation:** Use semantic heading level (h2) with proper hierarchy relative to page context.

---

### 4.2 GenerationProgress Component

**Overall Assessment: 9/10**

**Location:** `app/components/GenerationProgress.tsx`, lines 1-476

**Strengths:**
✓ Excellent modal accessibility (role="dialog", aria-modal, lines 106-122)
✓ Live region for progress updates (aria-live, lines 299-308)
✓ Time estimation with elapsed/remaining (lines 273-274)
✓ Simulated word count progress (lines 69-80)
✓ Animated states with accessibility considerations (lines 148-165)
✓ Proper error state handling (lines 189-235)
✓ Cancel button with clear labelling (lines 404-429)

**Issues:**

**Issue #34: Progress Bar Caps at 95%**
**Severity:** LOW
**Location:** `app/components/GenerationProgress.tsx`, line 94

Progress artificially capped at 95% to avoid false completion signals, but this could confuse users who see 95% for extended periods.

**Recommendation:** Cap at 90% and add explicit messaging: "Finalizing generation... (this may take a few moments)"

---

**Issue #35: Hardcoded Messages Array**
**Severity:** LOW
**Location:** `app/components/GenerationProgress.tsx`, lines 24-33

Generic messages don't reflect actual generation stages.

**Recommendation:** Accept messages as prop or use actual backend progress events.

---

## 5. Visual Design Consistency

### 5.1 Colour Usage

**Overall Assessment: 8/10**

**Strengths:**
✓ Comprehensive design token system (`app/lib/design-tokens.ts`, lines 1-280)
✓ WCAG AA compliant text colours (lines 33-40)
✓ Consistent brand gradient usage (line 47)
✓ Semantic colour system (lines 51-76)

**Issues:**

**Issue #36: Disabled Text Contrast**
**Severity:** MEDIUM
**Location:** `app/lib/design-tokens.ts`, line 38

Disabled text colour (#94A3B8) has 3.5:1 contrast ratio, which only passes for large text (18px+).

**Current:** `disabled: '#94A3B8'` (line 38)

**Impact:**
- Fails WCAG AA for normal-sized text
- May be hard to read for users with low vision

**Recommendation:** Use darker shade for disabled text on white backgrounds:
```typescript
disabled: '#64748B', // 5.8:1 contrast ratio - passes AA for all sizes
```

---

**Issue #37: Success Colour Contrast**
**Severity:** LOW
**Location:** `app/lib/design-tokens.ts`, lines 53-54

Success green (#10B981, 3.4:1 contrast) fails AA for normal text.

**Recommendation:** Use successDark (#059669, 4.5:1) for text, reserve success for large elements or backgrounds.

---

**Issue #38: Inconsistent Gradient Usage**
**Severity:** LOW
**Location:** Multiple files

Brand gradient is used inconsistently:
- Sometimes: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Sometimes: `linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)` (different colours)
- Sometimes: `linear-gradient(135deg, #10b981 0%, #059669 100%)` (green variant)

**Recommendation:** Define all gradient variants in design tokens and reference consistently.

---

### 5.2 Typography

**Overall Assessment: 7.5/10**

**Issues:**

**Issue #39: Inconsistent Font Sizing**
**Severity:** MEDIUM
**Location:** Multiple components

Font sizes vary between using design tokens (rem values) and hardcoded px values:
- Characters page: '0.8125rem' (line 232 of characters page)
- World page: '1rem' (line 622 of world page)
- Outline page: '0.813rem' (line 1279 of outline page)
- Plot page: '0.938rem' (line 1090 of plot page)

**Recommendation:** Use typography tokens consistently:
```typescript
// From design-tokens.ts
fontSize: {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
}
```

---

**Issue #40: Missing Font Family Declarations**
**Severity:** LOW
**Location:** Multiple components

Some components lack explicit font-family, relying on browser defaults which may be inconsistent.

**Recommendation:** Apply base font-family at root level:
```css
body {
  font-family: typography.fontFamily.base;
}
```

---

### 5.3 Spacing

**Overall Assessment: 7/10**

**Issues:**

**Issue #41: Inconsistent Padding Patterns**
**Severity:** MEDIUM
**Location:** Multiple components

Cards and containers use varying padding:
- Project page card: '1.5rem' (line 479 of project page)
- Characters page card: '2rem' (line 698 of characters page)
- Outline page card: '1.5rem' (line 881 of outline page)
- Plot page card: '1.5rem' (line 734 of plot page)

**Recommendation:** Use spacing tokens from design-tokens.ts:
```typescript
card: {
  padding: spacing[6], // 1.5rem / 24px - use consistently
}
```

---

**Issue #42: Gap Inconsistency**
**Severity:** LOW
**Location:** Multiple components

Grid and flex gaps vary widely:
- '0.5rem', '0.75rem', '1rem', '1.5rem', '2rem' all used throughout

**Recommendation:** Standardise to spacing tokens: `spacing.sm` (0.75rem), `spacing.md` (1rem), `spacing.lg` (1.5rem).

---

### 5.4 Button Styles

**Overall Assessment: 8/10**

**Strengths:**
✓ Consistent min-height for touch targets (44px)
✓ Clear visual hierarchy (primary, secondary, danger)
✓ Accessible focus states in most places

**Issues:**

**Issue #43: Button Sizing Inconsistency**
**Severity:** LOW
**Location:** Multiple components

Buttons use varying padding values:
- '0.5rem 1rem', '0.75rem 1.5rem', '1rem 2rem', '0.75rem 1rem'

**Recommendation:** Define button sizes in design tokens:
```typescript
button: {
  sm: { padding: '0.5rem 1rem' },
  md: { padding: '0.75rem 1.5rem' },
  lg: { padding: '1rem 2rem' },
}
```

---

**Issue #44: Disabled Button Opacity**
**Severity:** LOW
**Location:** Multiple components

Disabled states use varying opacity values (0.5, 0.6, 0.7) making consistency unclear.

**Recommendation:** Standardise disabled opacity to 0.6 across all interactive elements.

---

### 5.5 Card Designs

**Overall Assessment: 8.5/10**

**Strengths:**
✓ Consistent border-radius (12px typically)
✓ Subtle shadows for elevation (0 1px 3px rgba(0,0,0,0.05))
✓ Clear visual grouping

**Issues:**

**Issue #45: Varying Box Shadows**
**Severity:** LOW
**Location:** Multiple components

Cards use slightly different shadow values:
- '0 1px 3px rgba(0,0,0,0.05)'
- '0 2px 8px rgba(0,0,0,0.1)'
- '0 4px 14px rgba(102, 126, 234, 0.3)' (brand shadow)

**Recommendation:** Use shadow tokens consistently:
```typescript
shadows.sm, shadows.md, shadows.brand
```

---

## 6. Accessibility Assessment

### 6.1 WCAG Compliance

**Overall Assessment: 7.5/10**

**Strengths:**
✓ Design tokens include contrast ratio annotations (design-tokens.ts, lines 33-76)
✓ Min touch target sizes enforced (44px minimum)
✓ Focus indicators present on most interactive elements
✓ ARIA labels on buttons and landmarks
✓ Reduced-motion support in mobile navigation (line 450 of MobileNavigation)

**Issues:**

**Issue #46: Colour-Only Information**
**Severity:** HIGH
**Location:** ProjectNavigation status indicators (lines 186-197)

Workflow status relies solely on colour (green/red/blue/grey borders) without additional visual cues.

**Impact:**
- Fails WCAG 2.1 AA criterion 1.4.1 (Use of Color)
- Unusable for colour-blind users (~8% of male population)

**Recommendation:** Add icon indicators alongside colours (✓ complete, ! required, 🔒 locked).

---

**Issue #47: Missing Skip Links**
**Severity:** MEDIUM
**Location:** No skip-to-content links found

Users relying on keyboard navigation must tab through entire navigation before reaching main content.

**Recommendation:** Add skip link as first focusable element:
```tsx
<a href="#main-content" className="sr-only sr-only-focusable">
  Skip to main content
</a>
```

---

**Issue #48: Form Labels Not Programmatically Associated**
**Severity:** MEDIUM
**Location:** Multiple forms (plot page lines 788, 813; outline page lines 785, 813)

Labels use `style` objects with `display: 'block'` but don't use `htmlFor` attribute to associate with inputs.

**Recommendation:** Add id/htmlFor association:
```tsx
<label htmlFor="target-word-count" style={labelStyle}>
  Target Word Count
</label>
<input id="target-word-count" type="number" {...} />
```

---

**Issue #49: Modal Focus Trapping**
**Severity:** MEDIUM
**Location:** All modal dialogs (plot modals, outline confirmation, etc.)

Modals don't implement focus trap, allowing keyboard users to tab into background content.

**Recommendation:** Implement focus trap using libraries like `focus-trap-react` or manual implementation.

---

**Issue #50: Ambiguous Link Text**
**Severity:** LOW
**Location:** Project page line 404, 1253, etc.

Links with generic text like "→" or "View Progress" lack context when read out of order by screen readers.

**Recommendation:** Add aria-label with full context:
```tsx
<a href="..." aria-label="View progress for chapter generation">
  View Progress
</a>
```

---

### 6.2 Keyboard Navigation

**Overall Assessment: 7/10**

**Strengths:**
✓ Mobile drawer closable with Escape key (MobileNavigation line 82-90)
✓ Interactive elements generally keyboard accessible
✓ Focus indicators visible (though could be more consistent)

**Issues:**

**Issue #51: Collapsible Groups Not Fully Keyboard Accessible**
**Severity:** MEDIUM
**Location:** ProjectNavigation groups (lines 336-374), Outline page acts (lines 1284-1315)

Collapsible sections don't respond to Enter/Space keys, only click events.

**Recommendation:** Add keyboard handlers:
```tsx
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleGroup(groupId);
  }
}}
```

---

**Issue #52: Tab Order Issues in Forms**
**Severity:** LOW
**Location:** Complex forms like plot layer modal (lines 1441-1611)

Tab order doesn't always follow visual order due to flex/grid layouts.

**Recommendation:** Test with keyboard-only navigation and adjust tab order with tabindex if needed.

---

### 6.3 Screen Reader Compatibility

**Overall Assessment: 7/10**

**Strengths:**
✓ Semantic HTML usage (nav, section, aside, header)
✓ ARIA roles on custom components (role="dialog", role="progressbar")
✓ Live regions for dynamic content (aria-live="polite")

**Issues:**

**Issue #53: Status Updates Not Announced**
**Severity:** MEDIUM
**Location:** Job statistics updates (project page lines 502-618)

Job status changes update visually but don't trigger screen reader announcements.

**Recommendation:** Wrap statistics in aria-live region:
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {jobStats.running} running, {jobStats.pending} queued
</div>
```

---

**Issue #54: Image Alt Text Missing**
**Severity:** LOW
**Location:** Cover image upload (project page line 644)

CoverImageUpload component referenced but implementation not visible in audit.

**Recommendation:** Ensure uploaded images have alt text field and default alt describing the image.

---

**Issue #55: Complex UI Patterns Lack ARIA**
**Severity:** MEDIUM
**Location:** Plot visualization, chapter scene cards

Complex visualisations like plot timelines don't have descriptive ARIA labels explaining their purpose and data.

**Recommendation:** Add aria-describedby pointing to text description of visualisation data.

---

## 7. Responsive Design

### 7.1 Mobile Responsiveness

**Overall Assessment: 7.5/10**

**Strengths:**
✓ Mobile navigation with hamburger menu
✓ Touch-friendly targets (44px minimum)
✓ Responsive grid layouts with auto-fit/auto-fill
✓ Mobile-specific styling (media queries at 768px breakpoint)

**Issues:**

**Issue #56: Desktop Navigation Missing on Tablet**
**Severity:** HIGH
**Location:** MobileNavigation.tsx line 424

Navigation hidden for tablet (>768px) but no desktop alternative provided.

**Breakpoint:**
```css
@media (min-width: 769px) {
  .mobile-header { display: none !important; }
  .mobile-drawer { display: none !important; }
}
```

**Impact:**
- Tablet users (768px-1024px) have no visible navigation
- iPad Pro users affected

**Recommendation:** Show desktop sidebar from 769px, or extend mobile nav to 1024px.

---

**Issue #57: Table/Grid Overflow Not Handled**
**Severity:** MEDIUM
**Location:** Outline page act structure grid (line 986)

Grid uses `repeat(auto-fit, minmax(200px, 1fr))` which can cause horizontal scroll on narrow screens.

**Recommendation:** Reduce min width for mobile:
```tsx
gridTemplateColumns:
  window.innerWidth < 640
    ? '1fr'
    : 'repeat(auto-fit, minmax(200px, 1fr))'
```

---

**Issue #58: Modal Width on Mobile**
**Severity:** LOW
**Location:** Plot modals (line 1458), Outline dialogs (line 979)

Modals use `maxWidth: '500px'` with `width: '90%'`, which can still be cramped on phones.

**Recommendation:** Use full-width modals on mobile:
```tsx
maxWidth: window.innerWidth < 640 ? '100%' : '500px',
width: window.innerWidth < 640 ? '100%' : '90%',
margin: window.innerWidth < 640 ? 0 : 'auto',
```

---

**Issue #59: Font Sizes Not Responsive**
**Severity:** LOW
**Location:** Multiple components

Font sizes use fixed rem values without responsive scaling for mobile.

**Recommendation:** Use clamp() for fluid typography:
```css
font-size: clamp(0.875rem, 2vw, 1rem);
```

---

### 7.2 Tablet Optimisation

**Assessment: 6/10**

**Issue #60: No Tablet-Specific Layout**
**Severity:** MEDIUM
**Location:** All pages

Application jumps from mobile (<768px) to desktop (>768px) without tablet-optimised layout (768px-1024px).

**Recommendation:** Add tablet breakpoint:
```typescript
breakpoints: {
  mobile: '0-767px',
  tablet: '768-1023px',
  desktop: '1024px+',
}
```

---

## 8. Priority Recommendations Summary

### CRITICAL (Immediate - Within 1 Week)

1. **Create PrimaryNavigationBar for Desktop** (#1)
   File: Create `app/components/PrimaryNavigationBar.tsx`
   Impact: HIGH - Desktop users have no navigation
   Effort: MEDIUM

2. **Fix Tablet Navigation Gap** (#56)
   File: `app/components/MobileNavigation.tsx` line 424
   Impact: HIGH - Tablet users cannot navigate
   Effort: LOW

3. **Add Icons to Status Indicators** (#46)
   File: `app/components/shared/ProjectNavigation.tsx` lines 186-197
   Impact: HIGH - Accessibility compliance failure
   Effort: LOW

4. **Add Aria-Labels to Colour Picker** (#20)
   File: `app/projects/[id]/plot/page.tsx` lines 1536-1553
   Impact: HIGH - Feature completely inaccessible to screen readers
   Effort: LOW

---

### HIGH (Within 2 Weeks)

5. **Create Dedicated Chapters Page** (#26)
   File: Create `app/projects/[id]/chapters/page.tsx`
   Impact: HIGH - Broken navigation link
   Effort: MEDIUM

6. **Standardise Layout Pattern** (#15)
   File: `app/projects/[id]/world/page.tsx`
   Impact: MEDIUM - Inconsistent UX across pages
   Effort: MEDIUM

7. **Implement Focus Trapping in Modals** (#49)
   Files: All modal components
   Impact: MEDIUM - Accessibility issue
   Effort: MEDIUM

8. **Add Skip Links** (#47)
   File: Main layout component
   Impact: MEDIUM - Accessibility compliance
   Effort: LOW

---

### MEDIUM (Within 4 Weeks)

9. **Improve Disabled Text Contrast** (#36)
   File: `app/lib/design-tokens.ts` line 38
   Impact: MEDIUM - WCAG compliance
   Effort: LOW

10. **Replace alert() with Toast** (#31, #13)
    Files: `app/components/ExportButtons.tsx`, characters page
    Impact: MEDIUM - Better UX
    Effort: MEDIUM

11. **Standardise Button Sizes** (#43)
    Files: Design tokens + all components
    Impact: MEDIUM - Visual consistency
    Effort: MEDIUM

12. **Add Form Label Associations** (#48)
    Files: All form pages
    Impact: MEDIUM - Accessibility
    Effort: LOW

13. **Fix Border Status Indicators** (#6)
    File: `app/components/shared/ProjectNavigation.tsx`
    Impact: MEDIUM - Visual accessibility
    Effort: LOW

14. **Improve Act Structure Validation** (#19)
    File: `app/projects/[id]/plot/page.tsx`
    Impact: MEDIUM - Prevent user errors
    Effort: LOW

15. **Add Status Announcements** (#53)
    File: `app/projects/[id]/page.tsx` lines 502-618
    Impact: MEDIUM - Screen reader UX
    Effort: LOW

---

### LOW (Within 8 Weeks)

16. **Replace Emoji Icons with SVG** (#16, #8)
    Files: World page, ProjectNavigation
    Impact: LOW - Visual consistency
    Effort: LOW

17. **Improve Find & Replace UX** (#28)
    File: `app/components/ChapterEditor.tsx`
    Impact: LOW - Feature enhancement
    Effort: MEDIUM

18. **Add Clear Filters Button** (#12)
    File: `app/projects/[id]/characters/page.tsx`
    Impact: LOW - Usability improvement
    Effort: LOW

19. **Implement Responsive Typography** (#59)
    Files: Global styles
    Impact: LOW - Mobile enhancement
    Effort: LOW

20. **Standardise Font Sizes** (#39)
    Files: All components
    Impact: LOW - Design consistency
    Effort: MEDIUM

---

## 9. Design System Improvements

### 9.1 Recommended Design Token Additions

```typescript
// app/lib/design-tokens.ts additions

// Status indicator patterns
export const statusIndicators = {
  completed: { icon: '✓', color: colors.semantic.success },
  required: { icon: '!', color: colors.semantic.error },
  locked: { icon: '🔒', color: colors.text.disabled },
  active: { icon: '►', color: colors.brand.primary },
};

// Button size variants
export const buttonSizes = {
  sm: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    minHeight: '36px',
  },
  md: {
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.base,
    minHeight: a11y.minTouchTarget,
  },
  lg: {
    padding: `${spacing[4]} ${spacing[8]}`,
    fontSize: typography.fontSize.lg,
    minHeight: '52px',
  },
};

// Modal breakpoints
export const modalSizes = {
  sm: {
    mobile: { maxWidth: '100%', width: '100%', margin: 0 },
    tablet: { maxWidth: '400px', width: '90%' },
    desktop: { maxWidth: '480px', width: '90%' },
  },
  md: {
    mobile: { maxWidth: '100%', width: '100%', margin: 0 },
    tablet: { maxWidth: '600px', width: '90%' },
    desktop: { maxWidth: '700px', width: '90%' },
  },
  lg: {
    mobile: { maxWidth: '100%', width: '100%', margin: 0 },
    tablet: { maxWidth: '800px', width: '90%' },
    desktop: { maxWidth: '1000px', width: '90%' },
  },
};

// Gradient variants
export const gradients = {
  brand: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  info: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
};
```

---

### 9.2 Component Library Recommendations

Create reusable component library:

**Priority Components:**
1. `Button` - With size/variant props
2. `Input` - With validation states
3. `Modal` - With focus trap and size variants
4. `Toast` - For notifications
5. `StatusBadge` - With icon + colour
6. `Card` - With consistent padding/shadow
7. `FormField` - Label + input wrapper with proper associations

**Implementation Path:**
1. Create `app/components/ui/` directory
2. Build components using design tokens
3. Add Storybook for documentation
4. Migrate existing components gradually

---

## 10. Conclusion

NovelForge demonstrates a solid foundation with clear workflow structures and accessibility considerations. The design token system provides excellent groundwork for consistency. Primary improvements needed:

**Immediate Priorities:**
1. Fix navigation gaps (desktop/tablet)
2. Enhance accessibility (colour-independent indicators, ARIA labels, focus management)
3. Standardise layout patterns across pages

**Medium-Term Goals:**
1. Build component library for consistency
2. Improve responsive design for tablet
3. Enhanced error handling and user feedback

**Long-Term Vision:**
1. Comprehensive design system documentation
2. User testing with accessibility tools
3. Performance optimisation for large content

The application is well-positioned for these improvements, with modular component architecture and comprehensive design tokens providing a strong foundation for systematic enhancement.

---

**Report End**

*Review conducted by UX Design Specialist on 27 January 2026*
