import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d12',
        surface: '#161922',
        accent: '#e50914',
      },
    },
  },
  plugins: [],
};

export default config;
