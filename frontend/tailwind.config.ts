import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch: '#0a100d',
        pitchCard: '#111b16',
        pitchBorder: '#1e3027',
        limeBrand: '#b7f36b',
        limeDark: '#102016',
        limeAccent: '#86efac',
      },
    },
  },
  plugins: [],
};

export default config;
