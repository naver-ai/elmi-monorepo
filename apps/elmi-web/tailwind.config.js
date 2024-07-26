const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(
      __dirname,
      '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        "systembg": "#e8e9ee",
        "audiopanelbg": "#050505"
      },
      keyframes: {
        'music-indicate': {
          '0%': { "outline-width": "0", "outline-color": "rgba(243, 149, 146, 1)"},
          "100%": {"outline-width": "8px", "outline-color": "rgba(146, 243, 238, 0.2)"}
        },
        'bounce-emphasized': {
          '0%, 100%': {
            "transform": "translateY(-30%)scale(1.3)", 
            "animation-timing-function": "cubic-bezier(0.8, 0, 1, 1)"},
          "50%": {
            "transform": "translateY(0)scale(1)",
            "animation-timing-function": "cubic-bezier(0, 0, 0.2, 1)"
          }
        }
      },
      animation: {
        'bounce-fast': 'bounce 0.7s ease-in-out infinite',
        "music-indicate": "music-indicate 0.7s linear infinite",
        "bounce-emphasized": "bounce-emphasized 0.7s infinite", 
      }
    },
  },
  plugins: [],
};
