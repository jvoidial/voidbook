export const theme = {
  // VOID palette
  bg:         '#000000',
  surface:    '#0B0B0B',
  elevated:   '#141414',
  card:       '#0F0F0F',
  border:     '#1E1E1E',
  divider:    '#161616',
  text:       '#FFFFFF',
  subText:    '#B0B0B0',
  muted:      '#6E6E6E',
  accent:     '#00FFCC',
  accentDim:  'rgba(0,255,204,0.15)',
  danger:     '#FF4455',
  dangerDim:  'rgba(255,68,85,0.15)',
  success:    '#22CC88',
  warn:       '#FFB020',

  // Spacing scale
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,

  // Radii
  rSm: 8, rMd: 12, rLg: 16, rXl: 24, rPill: 999,

  // Typography
  h1: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13 },
  tiny: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Elevation
  shadow: {
    shadowColor: '#00FFCC',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  }
};
