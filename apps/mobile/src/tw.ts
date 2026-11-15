import { Platform } from 'react-native';
import { create } from 'twrnc';

export const twInstance = create({
  theme: {
    extend: {
      colors: {
        brand: '#a3e635',
        'brand-light': '#ecfccb',
        'brand-dark': '#4d7c0f',
        ai: '#6366f1',
        'ai-light': '#e0e7ff',
      },
    },
  },
});

type TwStyle = ReturnType<typeof twInstance.style>;

export const tw = (classNames: string): TwStyle => {
  const style = twInstance.style(classNames);
  if (Platform.OS === 'android' && style && typeof style === 'object') {
    const textMetrics = style as { fontSize?: unknown; fontWeight?: unknown };
    if (
      typeof textMetrics.fontSize === 'number' &&
      textMetrics.fontSize <= 13 &&
      (textMetrics.fontWeight === '700' ||
        textMetrics.fontWeight === '800' ||
        textMetrics.fontWeight === 'bold')
    ) {
      return {
        ...style,
        fontWeight: '600',
        fontFamily: 'sans-serif-medium',
      } as TwStyle;
    }
  }
  return style;
};

