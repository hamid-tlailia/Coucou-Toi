// Luxury palette: deep aubergine/onyx surfaces, champagne-gold accents.
export const GOLD = '#D4AF6A';
export const GOLD_L = '#F0D49A';
export const GOLD_D = '#A87D3E';
export const GOLD_GRAD = ['#F0D49A', '#D4AF6A', '#A87D3E'];
export const PLUM = '#7A3F63';
export const DEEP = '#2A1830';
export const GREEN = '#4CB782';
export const RED = '#E0655B';
export const BLUE = '#6B8AF2';

export const THEMES = {
  dark: {
    mode: 'dark',
    bg: '#0F0A11', surface: '#1A1220', raised: '#251A2B', border: 'rgba(212,175,106,0.13)',
    text: '#F6F0E8', muted: '#A3949F', faint: '#6E6170', accent: GOLD_L, onAccent: '#1A1214',
    heroGrad: ['#3B2442', '#1A1220'], overlay: 'rgba(5,3,6,0.7)',
  },
  light: {
    mode: 'light',
    bg: '#F7F3ED', surface: '#FFFFFF', raised: '#F0E9DF', border: '#E8DDCF',
    text: '#1C1418', muted: '#857780', faint: '#B5A9A5', accent: GOLD_D, onAccent: '#1A1214',
    heroGrad: ['#2E1B34', '#4A2A4F'], overlay: 'rgba(20,12,22,0.5)',
  },
};

export const FONT = {
  r: 'Tajawal_400Regular',
  m: 'Tajawal_500Medium',
  b: 'Tajawal_700Bold',
  x: 'Tajawal_800ExtraBold',
};

export const SOURCES = [
  { key: 'whatsapp', color: '#25D366', icon: 'logo-whatsapp' },
  { key: 'instagram', color: '#E1306C', icon: 'logo-instagram' },
  { key: 'facebook', color: '#1877F2', icon: 'logo-facebook' },
  { key: 'tiktok', color: '#FE2C55', icon: 'logo-tiktok' },
  { key: 'manual', color: '#8C7F8A', icon: 'create-outline' },
];
export const srcOf = (k) => SOURCES.find((s) => s.key === k) || SOURCES[4];

export const STATUS_KEYS = ['new', 'processing', 'shipped', 'delivered'];
export const STATUS_COLORS = { new: BLUE, processing: GOLD, shipped: PLUM, delivered: GREEN };
export const PAY_KEYS = ['paid', 'unpaid', 'cod'];
export const PAY_COLORS = { paid: GREEN, unpaid: RED, cod: GOLD };

export const shadow = (e = 4, color = '#000') => ({
  shadowColor: color,
  shadowOpacity: 0.18,
  shadowRadius: e * 2.5,
  shadowOffset: { width: 0, height: e },
  elevation: e,
});
