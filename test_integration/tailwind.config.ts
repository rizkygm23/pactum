import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ink-navy': '#0E1526',
        'graphite': '#1B2333',
        'brass': '#C9A227',
        'parchment': '#EDE8DC',
        'border-subtle': 'rgba(237, 232, 220, 0.08)'
      },
    },
  },
  plugins: [],
}
export default config
