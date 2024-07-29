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
        slideIn: {
          "0%": {opacity: 0.5, transform: "translateY(120%)"},
          "100%": {opacity: 1, transform: "translateY(0)"}
        },

        fadeIn: {
          "0%": {opacity: 0},
          "100%": {opacity: 1}
        }
      },

      animation: {
        slidein: "slideIn .25s ease-out",
        fadein: "fadeIn, 0.5s"
      }
    },
  },
  plugins: [],
};
