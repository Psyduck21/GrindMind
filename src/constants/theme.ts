export const COLORS = {
  bg: '#ffffff',
  s1: '#f9f9f9',
  s2: '#f0f0f0',
  s3: '#e8e8e8',
  border: '#e0e0e0',
  border2: '#d0d0d0',
  txt: '#000000',
  txt2: '#666666',
  txt3: '#999999',
  grn: '#1a7a4a',
  grnHi: '#105a30',
  grnLo: '#d6efe2',
  grnPill: 'rgba(26, 122, 74, 0.18)',
  grnBdr: 'rgba(26, 122, 74, 0.45)',
  white10: 'rgba(0, 0, 0, 0.05)',
  white20: 'rgba(0, 0, 0, 0.15)',
  danger: '#FF4757',
  warning: '#FFA502',
};

export const TYPOGRAPHY = {
  display: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: COLORS.txt,
    letterSpacing: -1,
  },
  header: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: COLORS.txt,
  },
  title: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: COLORS.txt,
  },
  bodyBold: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: COLORS.txt,
  },
  body: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.txt,
  },
  caption: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.txt2,
  },
  small: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: COLORS.txt3,
  },
};
