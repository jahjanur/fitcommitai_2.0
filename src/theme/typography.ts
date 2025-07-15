import { TextStyle } from 'react-native';

type TypographyStyle = Omit<TextStyle, 'fontWeight'> & {
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
};

const baseTextStyle: TypographyStyle = {
  fontFamily: 'System',
};

export const typography = {
  h1: {
    ...baseTextStyle,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  h2: {
    ...baseTextStyle,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  h3: {
    ...baseTextStyle,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  body1: {
    ...baseTextStyle,
    fontSize: 16,
    lineHeight: 24,
  },
  body2: {
    ...baseTextStyle,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    ...baseTextStyle,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    ...baseTextStyle,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
}; 