/**
 * digiCasino shared UI design tokens.
 *
 * Plain TS constants — intentionally framework-agnostic so they can be
 * consumed from CSS-in-JS, inline styles, or exported as CSS custom
 * properties without pulling in a UI library dependency.
 */

export const colors = {
  background: '#0b0f19',
  surface: '#141a2a',
  surfaceAlt: '#1c2338',
  border: '#2a3350',
  primary: '#f2b705',
  primaryHover: '#ffcc33',
  secondary: '#3ddc97',
  text: '#f5f6fa',
  textMuted: '#9aa3b8',
  danger: '#ef4444',
  success: '#22c55e',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
  xxl: '64px',
} as const;

export const typography = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSizeSm: '0.875rem',
  fontSizeBase: '1rem',
  fontSizeLg: '1.25rem',
  fontSizeXl: '2rem',
  fontSizeXxl: '3rem',
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  lineHeightBase: 1.5,
} as const;

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '16px',
  pill: '999px',
} as const;

export const theme = {
  colors,
  spacing,
  typography,
  radii,
} as const;

export type Theme = typeof theme;

export default theme;
