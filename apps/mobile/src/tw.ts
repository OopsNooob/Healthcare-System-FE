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

export const tw = (classNames: string) => twInstance.style(classNames);

