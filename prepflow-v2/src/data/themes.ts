// themes.ts — fully rewritten with CSS hex values for reliable rendering
// Apply colors via inline styles or CSS variables, NOT Tailwind partial strings.
// Usage example:
//   style={{ background: theme.colors.background, color: theme.colors.text }}
//   style={{ background: theme.colors.cardBg, color: theme.colors.cardText }}

export interface ThemeConfig {
  name: string;
  displayName: string;
  description: string;
  colors: {
    primary: string;       // accent buttons, links, highlights
    primaryText: string;   // text ON primary-colored buttons
    secondary: string;     // secondary accent
    accent: string;        // tertiary accent / badges
    background: string;    // page background (CSS value, can be a gradient)
    text: string;          // default body text ON background
    mutedText: string;     // secondary/muted text
    cardBg: string;        // card / panel background
    cardText: string;      // text inside cards
    cardBorder: string;    // card border color
    inputBg: string;       // input field background
    inputText: string;     // input field text
    inputBorder: string;   // input field border
  };
  font: string;
  effects: {
    glow: boolean;
    animations: boolean;
    shadows: boolean;
    borders: 'rounded' | 'sharp' | 'pill';
    shadowColor: string;   // for box-shadow tinting
  };
  chartColors: string[];
}

export const THEME_PRESETS: Record<string, ThemeConfig> = {

  // ─── DEFAULT ────────────────────────────────────────────────────────────────
  default: {
    name: 'default',
    displayName: 'Default',
    description: 'Clean modern gradient with indigo & purple',
    colors: {
      primary:      '#6366f1', // indigo-500
      primaryText:  '#ffffff',
      secondary:    '#8b5cf6', // violet-500
      accent:       '#ec4899', // pink-500
      background:   'linear-gradient(135deg, #eef2ff 0%, #ffffff 50%, #f5f3ff 100%)',
      text:         '#111827', // gray-900
      mutedText:    '#6b7280', // gray-500
      cardBg:       '#ffffff',
      cardText:     '#111827',
      cardBorder:   '#e5e7eb', // gray-200
      inputBg:      '#f9fafb',
      inputText:    '#111827',
      inputBorder:  '#d1d5db',
    },
    font: 'system',
    effects: {
      glow: false,
      animations: true,
      shadows: true,
      borders: 'rounded',
      shadowColor: 'rgba(99,102,241,0.15)',
    },
    chartColors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
  },

  // ─── DARK ───────────────────────────────────────────────────────────────────
  dark: {
    name: 'dark',
    displayName: 'Dark Mode',
    description: 'Easy on the eyes dark theme',
    colors: {
      primary:      '#60a5fa', // blue-400
      primaryText:  '#0f172a',
      secondary:    '#818cf8', // indigo-400
      accent:       '#a78bfa', // violet-400
      background:   '#030712', // gray-950
      text:         '#f1f5f9', // slate-100
      mutedText:    '#94a3b8', // slate-400
      cardBg:       '#111827', // gray-900
      cardText:     '#f1f5f9',
      cardBorder:   '#1f2937', // gray-800
      inputBg:      '#1f2937',
      inputText:    '#f1f5f9',
      inputBorder:  '#374151',
    },
    font: 'system',
    effects: {
      glow: false,
      animations: true,
      shadows: true,
      borders: 'rounded',
      shadowColor: 'rgba(0,0,0,0.4)',
    },
    chartColors: ['#60a5fa', '#818cf8', '#a78bfa', '#34d399', '#f472b6'],
  },

  // ─── NEON GLOW ──────────────────────────────────────────────────────────────
  neonGlow: {
    name: 'neonGlow',
    displayName: 'Neon Glow',
    description: 'Vibrant neon colors on deep dark',
    colors: {
      primary:      '#22d3ee', // cyan-400
      primaryText:  '#0a0a0a',
      secondary:    '#e879f9', // fuchsia-400
      accent:       '#a3e635', // lime-400
      background:   '#050a0e',
      text:         '#cffafe', // cyan-100
      mutedText:    '#67e8f9', // cyan-300
      cardBg:       '#0d1117',
      cardText:     '#e2f8fd',
      cardBorder:   '#164e63', // cyan-900
      inputBg:      '#0f1923',
      inputText:    '#cffafe',
      inputBorder:  '#0e7490',
    },
    font: 'system',
    effects: {
      glow: true,
      animations: true,
      shadows: true,
      borders: 'rounded',
      shadowColor: 'rgba(34,211,238,0.25)',
    },
    chartColors: ['#22d3ee', '#e879f9', '#a3e635', '#fb923c', '#f472b6'],
  },

  // ─── CYBERPUNK ──────────────────────────────────────────────────────────────
  cyberpunk: {
    name: 'cyberpunk',
    displayName: 'Cyberpunk',
    description: 'Futuristic purple & pink neon on near-black',
    colors: {
      primary:      '#c084fc', // purple-400
      primaryText:  '#0a0014',
      secondary:    '#f472b6', // pink-400
      accent:       '#22d3ee', // cyan-400
      background:   '#09000f',
      text:         '#f0abfc', // fuchsia-300
      mutedText:    '#c084fc', // purple-400
      cardBg:       '#13001f',
      cardText:     '#fae8ff', // fuchsia-100
      cardBorder:   '#581c87', // purple-900
      inputBg:      '#1a0030',
      inputText:    '#fae8ff',
      inputBorder:  '#7e22ce',
    },
    font: 'system',
    effects: {
      glow: true,
      animations: true,
      shadows: true,
      borders: 'sharp',
      shadowColor: 'rgba(192,132,252,0.3)',
    },
    chartColors: ['#c084fc', '#f472b6', '#22d3ee', '#facc15', '#a3e635'],
  },

  // ─── TYPEWRITER ─────────────────────────────────────────────────────────────
  typewriter: {
    name: 'typewriter',
    displayName: 'Typewriter',
    description: 'Retro monospace aesthetic on warm paper',
    colors: {
      primary:      '#92400e', // amber-800
      primaryText:  '#fffbeb',
      secondary:    '#b45309', // amber-700
      accent:       '#d97706', // amber-600
      background:   '#fef9ee',
      text:         '#1c1917', // stone-900
      mutedText:    '#78716c', // stone-500
      cardBg:       '#fffbeb', // amber-50
      cardText:     '#1c1917',
      cardBorder:   '#d6d3d1', // stone-300
      inputBg:      '#ffffff',
      inputText:    '#1c1917',
      inputBorder:  '#a8a29e',
    },
    font: 'mono',
    effects: {
      glow: false,
      animations: true,
      shadows: false,
      borders: 'sharp',
      shadowColor: 'rgba(0,0,0,0.1)',
    },
    chartColors: ['#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24'],
  },

  // ─── PASTEL ─────────────────────────────────────────────────────────────────
  pastel: {
    name: 'pastel',
    displayName: 'Pastel Dreams',
    description: 'Soft pastel gradient with gentle rose tones',
    colors: {
      primary:      '#e11d48', // rose-600
      primaryText:  '#ffffff',
      secondary:    '#db2777', // pink-600
      accent:       '#9333ea', // purple-600
      background:   'linear-gradient(135deg, #fce7f3 0%, #f5f3ff 50%, #dbeafe 100%)',
      text:         '#1e1b4b', // indigo-950
      mutedText:    '#7c3aed', // violet-600
      cardBg:       'rgba(255,255,255,0.85)',
      cardText:     '#1e1b4b',
      cardBorder:   '#fbcfe8', // pink-200
      inputBg:      '#fff1f2',
      inputText:    '#1e1b4b',
      inputBorder:  '#f9a8d4',
    },
    font: 'rounded',
    effects: {
      glow: false,
      animations: true,
      shadows: true,
      borders: 'pill',
      shadowColor: 'rgba(219,39,119,0.12)',
    },
    chartColors: ['#e11d48', '#db2777', '#9333ea', '#7c3aed', '#6366f1'],
  },

  // ─── STATIC / MINIMAL ───────────────────────────────────────────────────────
  static: {
    name: 'static',
    displayName: 'Static Minimal',
    description: 'No-frills black & white, no animations',
    colors: {
      primary:      '#18181b', // zinc-900
      primaryText:  '#ffffff',
      secondary:    '#3f3f46', // zinc-700
      accent:       '#71717a', // zinc-500
      background:   '#ffffff',
      text:         '#18181b',
      mutedText:    '#71717a',
      cardBg:       '#f4f4f5', // zinc-100
      cardText:     '#18181b',
      cardBorder:   '#d4d4d8', // zinc-300
      inputBg:      '#ffffff',
      inputText:    '#18181b',
      inputBorder:  '#a1a1aa',
    },
    font: 'system',
    effects: {
      glow: false,
      animations: false,
      shadows: false,
      borders: 'sharp',
      shadowColor: 'rgba(0,0,0,0)',
    },
    chartColors: ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'],
  },

  // ─── FOREST ─────────────────────────────────────────────────────────────────
  forest: {
    name: 'forest',
    displayName: 'Forest',
    description: 'Earthy greens and warm neutrals',
    colors: {
      primary:      '#15803d', // green-700
      primaryText:  '#ffffff',
      secondary:    '#166534', // green-800
      accent:       '#ca8a04', // yellow-600
      background:   'linear-gradient(135deg, #f0fdf4 0%, #fefce8 100%)',
      text:         '#14532d', // green-900
      mutedText:    '#4d7c0f', // lime-700
      cardBg:       '#ffffff',
      cardText:     '#14532d',
      cardBorder:   '#bbf7d0', // green-200
      inputBg:      '#f0fdf4',
      inputText:    '#14532d',
      inputBorder:  '#86efac',
    },
    font: 'system',
    effects: {
      glow: false,
      animations: true,
      shadows: true,
      borders: 'rounded',
      shadowColor: 'rgba(21,128,61,0.15)',
    },
    chartColors: ['#15803d', '#16a34a', '#4ade80', '#ca8a04', '#facc15'],
  },

  // ─── OCEAN ──────────────────────────────────────────────────────────────────
  ocean: {
    name: 'ocean',
    displayName: 'Ocean',
    description: 'Deep blues and aqua tones',
    colors: {
      primary:      '#0284c7', // sky-600
      primaryText:  '#ffffff',
      secondary:    '#0369a1', // sky-700
      accent:       '#0891b2', // cyan-600
      background:   'linear-gradient(135deg, #e0f2fe 0%, #ecfeff 100%)',
      text:         '#0c4a6e', // sky-900
      mutedText:    '#0369a1', // sky-700
      cardBg:       '#ffffff',
      cardText:     '#0c4a6e',
      cardBorder:   '#bae6fd', // sky-200
      inputBg:      '#f0f9ff',
      inputText:    '#0c4a6e',
      inputBorder:  '#7dd3fc',
    },
    font: 'system',
    effects: {
      glow: false,
      animations: true,
      shadows: true,
      borders: 'rounded',
      shadowColor: 'rgba(2,132,199,0.15)',
    },
    chartColors: ['#0284c7', '#0891b2', '#06b6d4', '#0369a1', '#0ea5e9'],
  },

};

// ─── FONT OPTIONS ────────────────────────────────────────────────────────────
export const FONT_OPTIONS = [
  { value: 'system',      label: 'System',       class: 'font-sans',        import: '' },
  { value: 'mono',        label: 'Monospace',    class: 'font-mono',        import: '' },
  { value: 'serif',       label: 'Serif',        class: 'font-serif',       import: '' },
  { value: 'rounded',     label: 'Rounded',      class: 'font-sans',        import: '' },
  { value: 'inter',       label: 'Inter',        class: 'font-inter',       import: 'Inter:wght@300;400;500;600;700' },
  { value: 'poppins',     label: 'Poppins',      class: 'font-poppins',     import: 'Poppins:wght@300;400;500;600;700' },
  { value: 'roboto',      label: 'Roboto',       class: 'font-roboto',      import: 'Roboto:wght@300;400;500;700' },
  { value: 'opensans',    label: 'Open Sans',    class: 'font-opensans',    import: 'Open+Sans:wght@300;400;600;700' },
  { value: 'montserrat',  label: 'Montserrat',   class: 'font-montserrat',  import: 'Montserrat:wght@300;400;500;600;700' },
  { value: 'playfair',    label: 'Playfair',     class: 'font-playfair',    import: 'Playfair+Display:wght@400;500;600;700' },
  { value: 'pacifico',    label: 'Pacifico',     class: 'font-pacifico',    import: 'Pacifico' },
  { value: 'oswald',      label: 'Oswald',       class: 'font-oswald',      import: 'Oswald:wght@300;400;500;600;700' },
  { value: 'merriweather',label: 'Merriweather', class: 'font-merriweather',import: 'Merriweather:wght@300;400;700' },
  { value: 'lato',        label: 'Lato',         class: 'font-lato',        import: 'Lato:wght@300;400;700' },
  { value: 'raleway',     label: 'Raleway',      class: 'font-raleway',     import: 'Raleway:wght@300;400;500;600;700' },
  { value: 'nunito',      label: 'Nunito',       class: 'font-nunito',      import: 'Nunito:wght@300;400;600;700' },
];

// ─── HELPER: get inline style object for the page root ───────────────────────
// Use this on your top-level layout div:
//   <div style={getThemeRootStyle(theme)} className={getThemeClasses(theme)}>
export function getThemeRootStyle(theme: ThemeConfig): React.CSSProperties {
  return {
    background: theme.colors.background,
    color: theme.colors.text,
    minHeight: '100vh',
  };
}

// ─── HELPER: get inline style for cards ──────────────────────────────────────
export function getCardStyle(theme: ThemeConfig): React.CSSProperties {
  const radius =
    theme.effects.borders === 'pill'  ? '9999px' :
    theme.effects.borders === 'sharp' ? '0px' :
    '12px';

  return {
    background: theme.colors.cardBg,
    color: theme.colors.cardText,
    border: `1px solid ${theme.colors.cardBorder}`,
    borderRadius: radius,
    boxShadow: theme.effects.shadows
      ? `0 4px 24px ${theme.effects.shadowColor}`
      : 'none',
  };
}

// ─── HELPER: get inline style for inputs ─────────────────────────────────────
export function getInputStyle(theme: ThemeConfig): React.CSSProperties {
  return {
    background: theme.colors.inputBg,
    color: theme.colors.inputText,
    border: `1px solid ${theme.colors.inputBorder}`,
    borderRadius: theme.effects.borders === 'sharp' ? '0px' : '8px',
  };
}

// ─── HELPER: primary button style ────────────────────────────────────────────
export function getPrimaryButtonStyle(theme: ThemeConfig): React.CSSProperties {
  return {
    background: theme.colors.primary,
    color: theme.colors.primaryText,
    border: 'none',
    borderRadius: theme.effects.borders === 'sharp' ? '0px' : '8px',
    boxShadow: theme.effects.glow
      ? `0 0 16px ${theme.effects.shadowColor}`
      : undefined,
  };
}

// ─── HELPER: CSS class string (font + effect toggles) ────────────────────────
// Keep using this alongside inline styles for font & animation classes.
export function getThemeClasses(theme: ThemeConfig): string {
  const classes: string[] = [];

  if (theme.effects.glow)        classes.push('theme-glow');
  if (!theme.effects.animations) classes.push('theme-no-animations');
  if (!theme.effects.shadows)    classes.push('theme-no-shadows');
  if (theme.effects.borders === 'sharp') classes.push('theme-sharp-borders');

  const fontOption = FONT_OPTIONS.find(f => f.value === theme.font);
  if (fontOption) classes.push(fontOption.class);

  return classes.join(' ');
}
