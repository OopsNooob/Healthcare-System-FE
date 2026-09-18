import { create } from 'twrnc';

const twInstance = create({
  theme: {
    extend: {
      colors: {
        brand: '#a3e635',
        'brand-light': '#ecfccb',
        ai: '#6366f1',
        'ai-light': '#e0e7ff',
      },
    },
  },
});

export const tw = (classNames: string) => twInstance.style(classNames);

