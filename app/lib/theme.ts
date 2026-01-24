export const theme = {
  colors: {
    // Light theme colors
    background: '#FAFAFA',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    text: '#212121',
    textSecondary: '#757575',
    textTertiary: '#B0B0B0',

    // Primary brand colors (purple-blue gradient)
    primary: '#667eea',
    primaryDark: '#764ba2',
    primaryLight: '#E8EEFA',

    // Status colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',

    // Specific states
    running: '#2196F3',
    completed: '#4CAF50',
    pending: '#FF9800',
    failed: '#F44336',
    paused: '#B0B0B0',
  },

  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 25px rgba(0,0,0,0.12)',
  },

  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
  },

  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
    },
  },
};
