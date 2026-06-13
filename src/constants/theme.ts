export const COLORS = {
  primary: '#14C8B5',
  darkEmerald: '#0D5C4A',
  mint: '#72C48F',
  lightMint: '#EAFBF7',
  bg: '#F4F7FA',
  white: '#FFFFFF',
  txt: '#1B1D23',
  txt2: '#6B7280',
  danger: '#FF4757',
  warning: '#FFA502',
  border: '#EAFBF7', // Very light mint for borders
  border2: '#E0E0E0',
  cardBg: '#FAFAFA', // Added for empty state cards
  // Keep some legacy keys so existing components don't instantly break before refactoring
  s1: '#FFFFFF',
  s2: '#F4F7FA',
  s3: '#EAFBF7',
  grn: '#14C8B5',
  grnHi: '#0D5C4A',
  grnLo: '#EAFBF7',
};

export const SHADOWS = {
  floating: {
    shadowColor: '#1B1D23',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  active: {
    shadowColor: '#14C8B5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 5,
  },
  fab: {
    shadowColor: '#14C8B5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  }
};

export const TYPOGRAPHY = {
  display: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: COLORS.txt,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: COLORS.txt,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: COLORS.txt,
  },
  h3: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: COLORS.txt,
  },
  bodyBold: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: COLORS.txt,
  },
  button: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: COLORS.txt,
    letterSpacing: 0.5,
  },
  body: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.txt,
  },
  caption: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: COLORS.txt2,
  },
  small: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.txt2,
  },
};
