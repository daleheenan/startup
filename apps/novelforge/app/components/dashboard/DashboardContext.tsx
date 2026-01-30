'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

// ==================== STORAGE KEYS ====================

const STORAGE_PREFIX = 'dashboard';
const storageKeys = {
  expandedGroups: `${STORAGE_PREFIX}:expandedGroups`,
  sidebarCollapsed: `${STORAGE_PREFIX}:sidebarCollapsed`,
} as const;

// ==================== STATE & TYPES ====================

export interface DashboardState {
  /** The currently active navigation item identifier, or null if none is active. */
  activeNavItem: string | null;
  /** Set of navigation group identifiers that are currently expanded. */
  expandedGroups: Set<string>;
  /** Whether the sidebar is in its collapsed (icon-only) state. */
  sidebarCollapsed: boolean;
  /** Whether the search overlay is currently open. */
  isSearchOpen: boolean;
  /** The current text entered into the search input. */
  searchQuery: string;
}

const initialState: DashboardState = {
  activeNavItem: null,
  expandedGroups: new Set(),
  sidebarCollapsed: false,
  isSearchOpen: false,
  searchQuery: '',
};

// ==================== ACTIONS ====================

export type DashboardAction =
  | { type: 'SET_ACTIVE_NAV_ITEM'; payload: string | null }
  | { type: 'TOGGLE_NAV_GROUP'; payload: string }
  | { type: 'EXPAND_NAV_GROUP'; payload: string }
  | { type: 'COLLAPSE_NAV_GROUP'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'OPEN_SEARCH' }
  | { type: 'CLOSE_SEARCH' }
  | { type: 'SET_SEARCH_QUERY'; payload: string };

// ==================== REDUCER ====================

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_ACTIVE_NAV_ITEM':
      return {
        ...state,
        activeNavItem: action.payload,
      };

    case 'TOGGLE_NAV_GROUP': {
      const groupId = action.payload;
      const next = new Set(state.expandedGroups);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return { ...state, expandedGroups: next };
    }

    case 'EXPAND_NAV_GROUP': {
      if (state.expandedGroups.has(action.payload)) {
        return state; // Already expanded -- no change needed
      }
      const next = new Set(state.expandedGroups);
      next.add(action.payload);
      return { ...state, expandedGroups: next };
    }

    case 'COLLAPSE_NAV_GROUP': {
      if (!state.expandedGroups.has(action.payload)) {
        return state; // Already collapsed -- no change needed
      }
      const next = new Set(state.expandedGroups);
      next.delete(action.payload);
      return { ...state, expandedGroups: next };
    }

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };

    case 'OPEN_SEARCH':
      return {
        ...state,
        isSearchOpen: true,
        searchQuery: '', // Reset query when opening search
      };

    case 'CLOSE_SEARCH':
      return {
        ...state,
        isSearchOpen: false,
        searchQuery: '',
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };

    default:
      return state;
  }
}

// ==================== CONTEXT ====================

interface DashboardContextValue {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

// ==================== PROVIDER ====================

export interface DashboardProviderProps {
  children: ReactNode;
  /** Optional initial set of expanded group IDs (overridden by persisted state if available). */
  defaultExpandedGroups?: string[];
  /** Whether the sidebar should start collapsed (overridden by persisted state if available). */
  defaultSidebarCollapsed?: boolean;
}

/**
 * DashboardProvider wraps the application (or a section of it) with shared
 * dashboard state. Navigation state and sidebar preferences are persisted to
 * localStorage so they survive page reloads.
 */
export function DashboardProvider({
  children,
  defaultExpandedGroups = [],
  defaultSidebarCollapsed = false,
}: DashboardProviderProps) {
  const [state, dispatch] = useReducer(dashboardReducer, {
    ...initialState,
    expandedGroups: new Set(defaultExpandedGroups),
    sidebarCollapsed: defaultSidebarCollapsed,
  });

  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate persisted state on mount (client-side only)
  useEffect(() => {
    const persistedGroups = loadExpandedGroups();
    if (persistedGroups !== null) {
      // Expand each persisted group individually to build the correct Set
      // Note: Do NOT reset activeNavItem here - Sidebar's useEffect sets it based on pathname
      persistedGroups.forEach(groupId => {
        dispatch({ type: 'EXPAND_NAV_GROUP', payload: groupId });
      });
    }

    const persistedCollapsed = loadSidebarCollapsed();
    if (persistedCollapsed !== null) {
      if (persistedCollapsed !== state.sidebarCollapsed) {
        dispatch({ type: 'TOGGLE_SIDEBAR' });
      }
    }

    setIsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally runs once on mount
  }, []);

  // Persist expandedGroups whenever they change (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveExpandedGroups(state.expandedGroups);
    }
  }, [state.expandedGroups, isHydrated]);

  // Persist sidebarCollapsed whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveSidebarCollapsed(state.sidebarCollapsed);
    }
  }, [state.sidebarCollapsed, isHydrated]);

  const contextValue = useMemo(
    () => ({ state, dispatch }),
    [state]
  );

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

// ==================== CONSUMER HOOK ====================

/**
 * useDashboardContext provides access to the shared dashboard state and dispatch.
 * Must be used within a DashboardProvider -- throws an error otherwise.
 */
export function useDashboardContext(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error(
      'useDashboardContext must be used within a DashboardProvider. ' +
      'Wrap a parent component in <DashboardProvider> to provide this context.'
    );
  }
  return context;
}

// ==================== PERSISTENCE HELPERS ====================

/**
 * Reads the persisted expanded groups from localStorage.
 * Returns null if no persisted value exists (allowing defaults to apply).
 */
function loadExpandedGroups(): string[] | null {
  if (typeof window === 'undefined') return null; // SSR guard

  try {
    const raw = localStorage.getItem(storageKeys.expandedGroups);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persists the current expanded groups to localStorage. */
function saveExpandedGroups(groups: Set<string>): void {
  if (typeof window === 'undefined') return; // SSR guard

  try {
    localStorage.setItem(storageKeys.expandedGroups, JSON.stringify(Array.from(groups)));
  } catch {
    // localStorage may be full or unavailable -- fail silently
  }
}

/**
 * Reads the persisted sidebar collapsed state from localStorage.
 * Returns null if no persisted value exists (allowing defaults to apply).
 */
function loadSidebarCollapsed(): boolean | null {
  if (typeof window === 'undefined') return null; // SSR guard

  try {
    const raw = localStorage.getItem(storageKeys.sidebarCollapsed);
    if (raw === null) return null;
    return raw === 'true';
  } catch {
    return null;
  }
}

/** Persists the sidebar collapsed state to localStorage. */
function saveSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return; // SSR guard

  try {
    localStorage.setItem(storageKeys.sidebarCollapsed, String(collapsed));
  } catch {
    // localStorage may be full or unavailable -- fail silently
  }
}
