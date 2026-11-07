import { Platform } from 'react-native';

// index-3.html :root değişkenleri
export const colors = {
  bg: '#f3efe4',
  /** Üst navigasyon: sayfa zemininden bir tık koyu (sabit durduğu için ayrışsın). */
  headerBg: '#e9e3d4',
  ink: '#0e0e10',
  mut: '#5d5b55',
  line: '#0e0e1022',
  cheese: '#ffc83d',
  cheeseDark: '#e59a00',
  cheeseLight: '#fff3c4',
  pink: '#a9c99b',
  peri: '#d4cd86',
  ok: '#16794a',
  squareLight: '#d4cd86',
  squareDark: '#86a97b',
  white: '#ffffff',
  danger: '#e8776e',
  // tahta vurguları
  lastMove: '#8b9cff66',
  check: '#e8776e',
  pieceWhite: '#fffbe6',
  pieceBlack: '#262626',
  // kart / uyarı yüzeyleri
  draft: '#fff7d6',
  msgOk: '#dff3e6',
  msgBad: '#ffe0e0',
  card: '#ffffffee',
  glass: '#ffffffee',
} as const;

const ios = Platform.OS === 'ios';
const android = Platform.OS === 'android';

export const fonts = {
  // h1..h3: "Iowan Old Style", Palatino, Georgia serif
  serif: ios ? 'Iowan Old Style' : android ? 'serif' : 'Georgia, "Iowan Old Style", Palatino, serif',
  // .clk, .moves, .eyebrow, .chip, .rk: ui-monospace
  mono: ios ? 'Menlo' : android ? 'monospace' : 'ui-monospace, Menlo, monospace',
} as const;

export const radius = {
  card: 26,
  head: 28,
  pill: 999,
  input: 14,
  chip: 999,
  board: 6,
  clock: 12,
} as const;

/** Web'de içerik 1100px'te ortalanır (main{max-width:1100px}). */
export const layout = {
  maxWidth: 1100,
  pad: 16,
} as const;

