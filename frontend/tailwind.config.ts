import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          0: '#0a0a0a',
          1: '#111111',
          2: '#171717',
          3: '#1f1f1f',
          4: '#27272a',
          5: '#2a2a2a',
        },
        txt: '#f0f0f0',
        muted: '#71717a',
        sm: '#52525b',
      },
    },
  },
  plugins: [],
}
export default config
