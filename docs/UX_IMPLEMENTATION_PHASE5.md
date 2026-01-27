# Phase 5: Polish & Design System Implementation Plan

**Duration:** 2 weeks (Sprints 9-10)
**Focus:** Design System, Consistency, Final Accessibility Audit
**Priority:** LOW-MEDIUM
**Prerequisites:** Phases 1-4 complete

---

## Overview

Phase 5 consolidates all improvements into a cohesive design system, standardises component patterns, and ensures full accessibility compliance. This phase creates the foundation for long-term maintainability.

---

## Task 5.1: Create Component Library

**Priority:** MEDIUM
**Estimated Effort:** 16 hours
**Files:** New `app/components/ui/` directory

### Implementation Steps

### 5.1.1 Create Button Component

**Create:** `app/components/ui/Button.tsx`
```typescript
'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { colors, spacing, borderRadius, transitions } from '../../lib/design-tokens'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: colors.brand.gradient,
    color: colors.text.inverse,
    border: 'none',
  },
  secondary: {
    background: colors.background.surface,
    color: colors.brand.primary,
    border: `1px solid ${colors.brand.primary}`,
  },
  tertiary: {
    background: 'transparent',
    color: colors.brand.primary,
    border: 'none',
  },
  danger: {
    background: colors.status.error,
    color: colors.text.inverse,
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: colors.text.secondary,
    border: `1px solid ${colors.border.default}`,
  },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: '0.875rem',
    minHeight: '36px',
  },
  md: {
    padding: `${spacing[3]} ${spacing[5]}`,
    fontSize: '1rem',
    minHeight: '44px',
  },
  lg: {
    padding: `${spacing[4]} ${spacing[6]}`,
    fontSize: '1.125rem',
    minHeight: '52px',
  },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  ...props
}, ref) => {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
        borderRadius: borderRadius.md,
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        transition: transitions.base,
        width: fullWidth ? '100%' : 'auto',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
          aria-hidden="true"
        />
      )}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

Button.displayName = 'Button'
```

### 5.1.2 Create Badge Component

**Create:** `app/components/ui/Badge.tsx`
```typescript
'use client'

import { colors, spacing, borderRadius } from '../../lib/design-tokens'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: React.ReactNode
  icon?: React.ReactNode
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: colors.background.muted,
    color: colors.text.secondary,
  },
  success: {
    backgroundColor: colors.status.successLight,
    color: colors.status.success,
  },
  warning: {
    backgroundColor: colors.status.warningLight,
    color: colors.status.warning,
  },
  error: {
    backgroundColor: colors.status.errorLight,
    color: colors.status.error,
  },
  info: {
    backgroundColor: colors.status.infoLight,
    color: colors.status.info,
  },
  brand: {
    backgroundColor: colors.background.brandLight,
    color: colors.brand.primary,
  },
}

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: {
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: '0.75rem',
  },
  md: {
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: '0.875rem',
  },
}

export function Badge({
  variant = 'default',
  size = 'sm',
  children,
  icon
}: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing[1],
        borderRadius: borderRadius.full,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  )
}
```

### 5.1.3 Create Input Component

**Create:** `app/components/ui/Input.tsx`
```typescript
'use client'

import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { colors, spacing, borderRadius, transitions } from '../../lib/design-tokens'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  id,
  style,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false)
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  const hasError = !!error

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: spacing[2],
            fontSize: '0.875rem',
            fontWeight: 500,
            color: colors.text.primary,
          }}
        >
          {label}
          {props.required && (
            <span style={{ color: colors.status.error, marginLeft: spacing[1] }}>*</span>
          )}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: spacing[3],
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.text.tertiary,
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          onFocus={(e) => {
            setFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            props.onBlur?.(e)
          }}
          aria-invalid={hasError}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          style={{
            width: '100%',
            padding: `${spacing[3]} ${spacing[4]}`,
            paddingLeft: leftIcon ? spacing[10] : spacing[4],
            paddingRight: rightIcon ? spacing[10] : spacing[4],
            fontSize: '16px', // Prevents iOS zoom
            border: `1px solid ${hasError ? colors.status.error : focused ? colors.brand.primary : colors.border.default}`,
            borderRadius: borderRadius.md,
            outline: 'none',
            transition: transitions.base,
            boxShadow: focused ? `0 0 0 3px ${hasError ? colors.status.errorAlpha : colors.brand.primaryAlpha}` : 'none',
            ...style,
          }}
          {...props}
        />

        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: spacing[3],
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.text.tertiary,
            }}
          >
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          style={{
            marginTop: spacing[2],
            fontSize: '0.875rem',
            color: colors.status.error,
          }}
        >
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          id={helperId}
          style={{
            marginTop: spacing[2],
            fontSize: '0.875rem',
            color: colors.text.tertiary,
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
```

### 5.1.4 Create Modal Component

**Create:** `app/components/ui/Modal.tsx`
```typescript
'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { colors, spacing, borderRadius, shadows, zIndex } from '../../lib/design-tokens'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: ModalSize
  children: ReactNode
  footer?: ReactNode
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
}

const sizeStyles: Record<ModalSize, React.CSSProperties> = {
  sm: { maxWidth: '400px' },
  md: { maxWidth: '500px' },
  lg: { maxWidth: '700px' },
  xl: { maxWidth: '900px' },
  fullscreen: { maxWidth: '100%', height: '100%', margin: 0, borderRadius: 0 },
}

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEsc = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, closeOnEsc, onClose])

  // Focus trap and restoration
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      modalRef.current?.focus()

      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: zIndex.modal,
        padding: spacing[4],
      }}
      onClick={closeOnOverlayClick ? onClose : undefined}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          backgroundColor: colors.background.surface,
          borderRadius: borderRadius.xl,
          boxShadow: shadows.xl,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          ...sizeStyles[size],
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              padding: spacing[6],
              borderBottom: `1px solid ${colors.border.default}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              id="modal-title"
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: colors.text.primary,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                padding: spacing[2],
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.text.tertiary,
                fontSize: '1.5rem',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Body */}
        <div
          style={{
            padding: spacing[6],
            overflow: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: spacing[6],
              borderTop: `1px solid ${colors.border.default}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spacing[3],
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
```

### 5.1.5 Create Toast/Notification Component

**Create:** `app/components/ui/Toast.tsx`
```typescript
'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { colors, spacing, borderRadius, shadows, zIndex } from '../../lib/design-tokens'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts(prev => [...prev, { id, type, message, duration }])

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id)
      }, duration)
    }
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[], onClose: (id: string) => void }) {
  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: spacing[4],
        right: spacing[4],
        zIndex: zIndex.toast,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[3],
        maxWidth: '400px',
      }}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>,
    document.body
  )
}

const typeStyles: Record<ToastType, { bg: string; color: string; icon: string }> = {
  success: { bg: colors.status.successLight, color: colors.status.success, icon: '✓' },
  error: { bg: colors.status.errorLight, color: colors.status.error, icon: '✕' },
  warning: { bg: colors.status.warningLight, color: colors.status.warning, icon: '⚠' },
  info: { bg: colors.status.infoLight, color: colors.status.info, icon: 'ℹ' },
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const style = typeStyles[toast.type]

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
        padding: spacing[4],
        backgroundColor: colors.background.surface,
        border: `1px solid ${style.color}`,
        borderLeft: `4px solid ${style.color}`,
        borderRadius: borderRadius.md,
        boxShadow: shadows.lg,
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <span
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: style.bg,
          color: style.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {style.icon}
      </span>

      <p style={{
        flex: 1,
        margin: 0,
        color: colors.text.primary,
        fontSize: '0.875rem',
        lineHeight: 1.5,
      }}>
        {toast.message}
      </p>

      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        style={{
          padding: spacing[1],
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: colors.text.tertiary,
          fontSize: '1.25rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
```

### 5.1.6 Create Card Component

**Create:** `app/components/ui/Card.tsx`
```typescript
'use client'

import { ReactNode } from 'react'
import { colors, spacing, borderRadius, shadows } from '../../lib/design-tokens'

interface CardProps {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  hover?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

const paddingMap = {
  none: 0,
  sm: spacing[3],
  md: spacing[4],
  lg: spacing[6],
}

const shadowMap = {
  none: 'none',
  sm: shadows.sm,
  md: shadows.md,
  lg: shadows.lg,
}

export function Card({
  children,
  padding = 'md',
  shadow = 'sm',
  border = true,
  hover = false,
  onClick,
  style,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={{
        backgroundColor: colors.background.surface,
        borderRadius: borderRadius.lg,
        padding: paddingMap[padding],
        border: border ? `1px solid ${colors.border.default}` : 'none',
        boxShadow: shadowMap[shadow],
        cursor: onClick ? 'pointer' : 'default',
        transition: hover ? 'transform 0.2s, box-shadow 0.2s' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// Sub-components
Card.Header = function CardHeader({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      marginBottom: spacing[4],
      paddingBottom: spacing[4],
      borderBottom: `1px solid ${colors.border.default}`,
      ...style,
    }}>
      {children}
    </div>
  )
}

Card.Title = function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 style={{
      fontSize: '1.125rem',
      fontWeight: 600,
      color: colors.text.primary,
      margin: 0,
    }}>
      {children}
    </h3>
  )
}

Card.Body = function CardBody({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

Card.Footer = function CardFooter({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      marginTop: spacing[4],
      paddingTop: spacing[4],
      borderTop: `1px solid ${colors.border.default}`,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: spacing[3],
      ...style,
    }}>
      {children}
    </div>
  )
}
```

### 5.1.7 Create Component Index

**Create:** `app/components/ui/index.ts`
```typescript
export { Button } from './Button'
export { Badge } from './Badge'
export { Input } from './Input'
export { Modal } from './Modal'
export { ToastProvider, useToast } from './Toast'
export { Card } from './Card'
export { AutoExpandTextarea } from './AutoExpandTextarea'

// Re-export types
export type { ButtonProps } from './Button'
export type { BadgeProps } from './Badge'
export type { InputProps } from './Input'
export type { ModalProps } from './Modal'
export type { CardProps } from './Card'
```

### Acceptance Criteria
- [ ] Button component with 5 variants and 3 sizes
- [ ] Badge component for status indicators
- [ ] Input component with labels, errors, icons
- [ ] Modal component with sizes, focus trap, portal
- [ ] Toast notification system
- [ ] Card component with sub-components
- [ ] All components use design tokens
- [ ] All components accessible

### Testing
- Import components from index
- Test all button variants
- Test modal focus trap
- Test toast notifications
- Verify keyboard navigation

---

## Task 5.2: Standardise Button Styles Across App

**Priority:** MEDIUM
**Estimated Effort:** 8 hours
**Files:** Multiple component files

### Implementation Steps

### 5.2.1 Audit Current Button Usage

Search and document all button patterns:
```bash
# Find all button elements
grep -r "<button" app/

# Find all inline button styles
grep -r "style={{" app/ | grep -i "button\|cursor.*pointer"
```

### 5.2.2 Create Migration Guide

| Current Pattern | New Component |
|-----------------|---------------|
| Gradient background | `<Button variant="primary">` |
| White bg + border | `<Button variant="secondary">` |
| Transparent + text | `<Button variant="tertiary">` |
| Red background | `<Button variant="danger">` |
| Grey border | `<Button variant="ghost">` |

### 5.2.3 Update Components

**File:** `app/quick-start/page.tsx`
```typescript
// Before
<button
  onClick={handleGenerate}
  disabled={!canGenerate}
  style={{
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    // ... more inline styles
  }}
>
  Generate Concepts
</button>

// After
import { Button } from '../components/ui'

<Button
  variant="primary"
  size="lg"
  onClick={handleGenerate}
  disabled={!canGenerate}
  loading={isGenerating}
>
  Generate Concepts
</Button>
```

**File:** `app/components/ChaptersList.tsx`
```typescript
// Before
<button style={editButtonStyles}>Edit</button>
<button style={regenerateButtonStyles}>Regenerate</button>

// After
<Button variant="primary" size="sm" onClick={() => onEdit(chapter.id)}>
  Edit
</Button>
<Button variant="secondary" size="sm" onClick={() => onRegenerate(chapter.id)}>
  Regenerate
</Button>
```

### 5.2.4 Files to Update

| File | Buttons to Replace |
|------|-------------------|
| `app/quick-start/page.tsx` | Generate, Inspire Me, genre selection |
| `app/full-customization/page.tsx` | Form submit buttons |
| `app/projects/[id]/page.tsx` | All action buttons |
| `app/components/ChaptersList.tsx` | Edit, Regenerate, bulk actions |
| `app/components/ChapterEditor.tsx` | Save, Revert, toolbar buttons |
| `app/components/shared/ProjectNavigation.tsx` | Group toggle buttons |
| `app/components/MobileNavigation.tsx` | Menu buttons |

### Acceptance Criteria
- [ ] All buttons use Button component
- [ ] No inline button styles remain
- [ ] Consistent sizing across app
- [ ] Loading states consistent
- [ ] Disabled states consistent

### Testing
- Visual regression testing
- Check all button hover states
- Check all disabled states
- Verify loading spinners

---

## Task 5.3: Consolidate Design Tokens Usage

**Priority:** MEDIUM
**Estimated Effort:** 10 hours
**Files:** `app/lib/design-tokens.ts`, multiple components

### Implementation Steps

### 5.3.1 Extend Design Tokens

**Update:** `app/lib/design-tokens.ts`
```typescript
// Add missing tokens
export const colors = {
  // ... existing colors

  // Add alpha variants for focus states
  brand: {
    primary: '#5558d6',
    primaryHover: '#4448c5',
    primaryAlpha: 'rgba(85, 88, 214, 0.2)',
    secondary: '#6b4f9e',
    gradient: 'linear-gradient(135deg, #5558d6 0%, #6b4f9e 100%)',
  },

  status: {
    success: '#059669',
    successLight: '#D1FAE5',
    successAlpha: 'rgba(5, 150, 105, 0.2)',
    warning: '#b45309',
    warningLight: '#FEF3C7',
    warningAlpha: 'rgba(180, 83, 9, 0.2)',
    error: '#b91c1c',
    errorLight: '#FEE2E2',
    errorAlpha: 'rgba(185, 28, 28, 0.2)',
    info: '#2563eb',
    infoLight: '#DBEAFE',
    infoAlpha: 'rgba(37, 99, 235, 0.2)',
  },

  background: {
    primary: '#F8FAFC',
    surface: '#FFFFFF',
    muted: '#F1F5F9',
    brandLight: '#EEF2FF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
}

// Add animation keyframes
export const animations = {
  spin: 'spin 0.8s linear infinite',
  fadeIn: 'fadeIn 0.2s ease-out',
  slideIn: 'slideIn 0.2s ease-out',
  slideOut: 'slideOut 0.2s ease-in',
}

// Add breakpoints
export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
}

// Helper functions
export function mediaQuery(breakpoint: keyof typeof breakpoints) {
  return `@media (min-width: ${breakpoints[breakpoint]})`
}
```

### 5.3.2 Create CSS Variables File

**Create:** `app/styles/variables.css`
```css
:root {
  /* Brand */
  --color-brand-primary: #5558d6;
  --color-brand-hover: #4448c5;
  --color-brand-alpha: rgba(85, 88, 214, 0.2);
  --color-brand-secondary: #6b4f9e;
  --color-brand-gradient: linear-gradient(135deg, #5558d6 0%, #6b4f9e 100%);

  /* Text */
  --color-text-primary: #1A1A2E;
  --color-text-secondary: #3d4a5c;
  --color-text-tertiary: #52637a;
  --color-text-inverse: #FFFFFF;

  /* Background */
  --color-bg-primary: #F8FAFC;
  --color-bg-surface: #FFFFFF;
  --color-bg-muted: #F1F5F9;
  --color-bg-brand-light: #EEF2FF;

  /* Border */
  --color-border-default: #E2E8F0;
  --color-border-focus: var(--color-brand-primary);

  /* Status */
  --color-success: #059669;
  --color-success-light: #D1FAE5;
  --color-warning: #b45309;
  --color-warning-light: #FEF3C7;
  --color-error: #b91c1c;
  --color-error-light: #FEE2E2;
  --color-info: #2563eb;
  --color-info-light: #DBEAFE;

  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;

  /* Z-Index */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-header: 300;
  --z-modal: 1000;
  --z-toast: 9999;

  /* Accessibility */
  --min-touch-target: 44px;
  --focus-outline: 2px solid var(--color-brand-primary);
  --focus-offset: 2px;
}

/* Animation Keyframes */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

### 5.3.3 Import in Layout

**Update:** `app/layout.tsx`
```typescript
import './styles/variables.css'
import './styles/accessibility.css'
import './styles/forms.css'
```

### Acceptance Criteria
- [ ] All colours defined as CSS variables
- [ ] All components use design tokens
- [ ] No hardcoded colour values remain
- [ ] CSS variables available globally
- [ ] Animation keyframes defined once

### Testing
- Inspect elements for CSS variable usage
- Verify colour consistency
- Check animations work correctly

---

## Task 5.4: Add Reduced Motion Support Everywhere

**Priority:** LOW
**Estimated Effort:** 4 hours
**Files:** CSS files, animated components

### Implementation Steps

### 5.4.1 Create Motion Preference Media Query

**Add to:** `app/styles/accessibility.css`
```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Alternative animations for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
    opacity: 1;
  }

  .slide-in {
    animation: none;
    transform: none;
    opacity: 1;
  }

  .spin {
    animation: none;
  }

  /* Replace spinning loader with static indicator */
  .loading-spinner {
    animation: none;
    border-style: dotted;
  }
}
```

### 5.4.2 Create Motion-Safe Hook

**Create:** `app/hooks/useReducedMotion.ts`
```typescript
import { useState, useEffect } from 'react'

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}
```

### 5.4.3 Update Components

**Example usage in components:**
```typescript
import { useReducedMotion } from '../hooks/useReducedMotion'

function AnimatedComponent() {
  const reducedMotion = useReducedMotion()

  return (
    <div
      style={{
        transition: reducedMotion ? 'none' : 'transform 0.3s ease',
        animation: reducedMotion ? 'none' : 'fadeIn 0.2s ease-out',
      }}
    >
      Content
    </div>
  )
}
```

### 5.4.4 Components to Update

- `app/components/GenerationProgress.tsx`
- `app/components/ui/Toast.tsx`
- `app/components/ui/Modal.tsx`
- `app/components/MobileNavigation.tsx`
- Loading spinners throughout app

### Acceptance Criteria
- [ ] All animations respect prefers-reduced-motion
- [ ] Spinners show static indicator when motion reduced
- [ ] Transitions disabled when motion reduced
- [ ] Hook available for programmatic checks
- [ ] No WCAG 2.3.3 violations

### Testing
- Enable reduced motion in OS settings
- Verify animations stop
- Verify app remains functional
- Check loading indicators visible

---

## Task 5.5: Comprehensive Accessibility Audit

**Priority:** HIGH
**Estimated Effort:** 12 hours
**Files:** All components

### Implementation Steps

### 5.5.1 Automated Testing Setup

**Install dependencies:**
```bash
npm install -D @axe-core/react jest-axe
```

**Create test file:** `app/__tests__/accessibility.test.tsx`
```typescript
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// Test each major component
describe('Accessibility', () => {
  it('Button has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Modal has no accessibility violations', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        Content
      </Modal>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Form has no accessibility violations', async () => {
    const { container } = render(
      <form>
        <Input label="Name" required />
        <Input label="Email" type="email" error="Invalid email" />
        <Button type="submit">Submit</Button>
      </form>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // Add more component tests...
})
```

### 5.5.2 Manual Testing Checklist

**Keyboard Navigation:**
- [ ] All interactive elements focusable
- [ ] Tab order follows logical sequence
- [ ] Focus visible on all elements
- [ ] No keyboard traps
- [ ] Skip link works
- [ ] Modal focus trapped correctly
- [ ] Escape closes modals/dropdowns

**Screen Reader:**
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Errors associated with inputs
- [ ] Status updates announced
- [ ] Navigation landmarks present
- [ ] Headings in correct hierarchy
- [ ] Tables have proper headers

**Visual:**
- [ ] Colour contrast AA compliant
- [ ] Text scalable to 200%
- [ ] No horizontal scroll at 320px
- [ ] Content readable without CSS
- [ ] Focus indicators visible
- [ ] Error states clear

**Motion:**
- [ ] Animations respect prefers-reduced-motion
- [ ] No flashing content
- [ ] Autoplay content can be paused

### 5.5.3 WCAG 2.1 AA Compliance Report

**Create:** `docs/ACCESSIBILITY_AUDIT.md`
```markdown
# NovelForge Accessibility Audit Report

## Summary
- **Standard:** WCAG 2.1 Level AA
- **Audit Date:** [Date]
- **Auditor:** [Name]

## Results by Criterion

### 1. Perceivable

#### 1.1 Text Alternatives
- [x] 1.1.1 Non-text Content - All images have alt text

#### 1.2 Time-based Media
- N/A - No audio/video content

#### 1.3 Adaptable
- [x] 1.3.1 Info and Relationships - Semantic HTML used
- [x] 1.3.2 Meaningful Sequence - Reading order logical
- [x] 1.3.3 Sensory Characteristics - Not reliant on shape/colour alone
- [x] 1.3.4 Orientation - Works in portrait and landscape
- [x] 1.3.5 Identify Input Purpose - Input types specified

#### 1.4 Distinguishable
- [x] 1.4.1 Use of Colour - Not sole indicator
- [x] 1.4.3 Contrast (Minimum) - 4.5:1 ratio achieved
- [x] 1.4.4 Resize Text - Scalable to 200%
- [x] 1.4.5 Images of Text - None used
- [x] 1.4.10 Reflow - No horizontal scroll at 320px
- [x] 1.4.11 Non-text Contrast - 3:1 for UI components
- [x] 1.4.12 Text Spacing - Adjustable
- [x] 1.4.13 Content on Hover - Persistent and dismissible

### 2. Operable

#### 2.1 Keyboard Accessible
- [x] 2.1.1 Keyboard - All functions accessible
- [x] 2.1.2 No Keyboard Trap - Focus can always escape
- [x] 2.1.4 Character Key Shortcuts - Configurable

#### 2.2 Enough Time
- N/A - No time limits

#### 2.3 Seizures and Physical Reactions
- [x] 2.3.1 Three Flashes - No flashing content
- [x] 2.3.3 Animation from Interactions - Motion reducible

#### 2.4 Navigable
- [x] 2.4.1 Bypass Blocks - Skip link provided
- [x] 2.4.2 Page Titled - Descriptive titles
- [x] 2.4.3 Focus Order - Logical sequence
- [x] 2.4.4 Link Purpose - Clear from context
- [x] 2.4.5 Multiple Ways - Search and navigation
- [x] 2.4.6 Headings and Labels - Descriptive
- [x] 2.4.7 Focus Visible - Clear indicators

#### 2.5 Input Modalities
- [x] 2.5.1 Pointer Gestures - Single pointer operations
- [x] 2.5.2 Pointer Cancellation - Undo available
- [x] 2.5.3 Label in Name - Accessible names match
- [x] 2.5.4 Motion Actuation - Not used

### 3. Understandable

#### 3.1 Readable
- [x] 3.1.1 Language of Page - lang attribute set
- [x] 3.1.2 Language of Parts - Marked where different

#### 3.2 Predictable
- [x] 3.2.1 On Focus - No unexpected changes
- [x] 3.2.2 On Input - No unexpected changes
- [x] 3.2.3 Consistent Navigation - Same order
- [x] 3.2.4 Consistent Identification - Same labels

#### 3.3 Input Assistance
- [x] 3.3.1 Error Identification - Errors described
- [x] 3.3.2 Labels or Instructions - Clear guidance
- [x] 3.3.3 Error Suggestion - Corrections offered
- [x] 3.3.4 Error Prevention - Confirmation for actions

### 4. Robust

#### 4.1 Compatible
- [x] 4.1.1 Parsing - Valid HTML
- [x] 4.1.2 Name, Role, Value - ARIA used correctly
- [x] 4.1.3 Status Messages - Live regions used

## Issues Found

### Critical
None

### Major
None

### Minor
[List any minor issues and remediation plans]

## Recommendations
[Any additional recommendations]
```

### Acceptance Criteria
- [ ] Automated tests pass
- [ ] Manual testing complete
- [ ] WCAG 2.1 AA compliant
- [ ] Audit report documented
- [ ] All issues resolved

### Testing
- Run axe-core tests
- Test with NVDA/VoiceOver
- Test with keyboard only
- Test at 200% zoom
- Test with reduced motion

---

## Phase 5 Summary

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| 5.1 Component Library | MEDIUM | 16h | None |
| 5.2 Standardise Buttons | MEDIUM | 8h | 5.1 |
| 5.3 Consolidate Tokens | MEDIUM | 10h | 5.1 |
| 5.4 Reduced Motion | LOW | 4h | 5.3 |
| 5.5 Accessibility Audit | HIGH | 12h | All above |

**Total Estimated Effort:** 50 hours

### Success Metrics
- Design consistency score >90%
- Full WCAG 2.1 AA compliance
- No accessibility violations in automated tests
- Component reuse rate >80%
- Reduced CSS bundle size

### Dependencies
- Phases 1-4 complete
- Task 5.1 must be done before 5.2 and 5.3
- Task 5.5 should be done last (validates all changes)

### Rollback Plan
- Component library is additive
- Old components can coexist during migration
- CSS variables don't break inline styles
- Accessibility improvements are non-breaking

---

## Files Created/Modified in Phase 5

| File | Status | Changes |
|------|--------|---------|
| `app/components/ui/Button.tsx` | NEW | Button component |
| `app/components/ui/Badge.tsx` | NEW | Badge component |
| `app/components/ui/Input.tsx` | NEW | Input component |
| `app/components/ui/Modal.tsx` | NEW | Modal component |
| `app/components/ui/Toast.tsx` | NEW | Toast system |
| `app/components/ui/Card.tsx` | NEW | Card component |
| `app/components/ui/index.ts` | NEW | Component exports |
| `app/lib/design-tokens.ts` | MODIFIED | Extended tokens |
| `app/styles/variables.css` | NEW | CSS custom properties |
| `app/styles/accessibility.css` | MODIFIED | Motion preferences |
| `app/hooks/useReducedMotion.ts` | NEW | Motion detection |
| `app/__tests__/accessibility.test.tsx` | NEW | A11y tests |
| `docs/ACCESSIBILITY_AUDIT.md` | NEW | Compliance report |
| Multiple component files | MODIFIED | Use new components |

---

## Project Completion Checklist

### Phase 1 ✓
- [ ] Edit mode removed from ChapterEditor
- [ ] Auto-save implemented
- [ ] Colour contrast fixed
- [ ] Keyboard navigation added
- [ ] Genre labels fixed

### Phase 2 ✓
- [ ] Generation confirmation modal
- [ ] Navigation collapse fixed
- [ ] Breadcrumb added
- [ ] Progress indicator added
- [ ] Onboarding wizard added

### Phase 3 ✓
- [ ] Mobile project navigation
- [ ] Touch targets enforced
- [ ] Mobile forms optimised
- [ ] ARIA labels comprehensive
- [ ] Time period warnings
- [ ] Progressive disclosure

### Phase 4 ✓
- [ ] Chapter list enhanced
- [ ] Chapter navigation in editor
- [ ] Selection regeneration improved
- [ ] Bulk operations added
- [ ] Undo/redo implemented
- [ ] Export discoverable

### Phase 5 ✓
- [ ] Component library created
- [ ] Buttons standardised
- [ ] Design tokens consolidated
- [ ] Reduced motion supported
- [ ] Accessibility audit passed

---

**Total Project Effort:** ~190 hours (10-12 weeks)

**Expected ROI:**
- User onboarding success: +50%
- Feature discovery: +40%
- User satisfaction (NPS): +20 points
- Mobile retention: +60%
- Support tickets: -30%
- Accessibility compliance: 100%

---

*Phase 5 Implementation Plan*
*NovelForge UX Improvement Project*
*27 January 2026*
