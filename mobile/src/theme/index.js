export const PLUM = '#7A3F63';
export const DEEP = '#4A2545';
export const GOLD = '#B68A4E';
export const GREEN = '#3F8F63';
export const RED = '#C24B44';

export const THEMES = {
  light: { bg:'#FBF9FA', surface:'#FFFFFF', raised:'#F3EEF3', text:'#241726', muted:'#8A7A8C', border:'#EDE4EE' },
  dark:  { bg:'#17111A', surface:'#221A26', raised:'#2C2231', text:'#F3EDF4', muted:'#A493A6', border:'#332839' },
};

export const SOURCES = [
  { key:'whatsapp',  color:'#25D366' },
  { key:'instagram', color:'#DD2A7B' },
  { key:'facebook',  color:'#1877F2' },
  { key:'tiktok',    color:'#FE2C55' },
  { key:'manual',    color:'#64748B' },
];
export const srcOf = (k) => SOURCES.find((s) => s.key === k) || SOURCES[4];

export const STATUS_KEYS = ['new','processing','shipped','delivered'];
export const PAY_KEYS = ['paid','unpaid','cod'];

export const shadow = (e = 4) => ({
  shadowColor: '#4A2545',
  shadowOpacity: 0.12,
  shadowRadius: e * 2,
  shadowOffset: { width: 0, height: e },
  elevation: e,
});
