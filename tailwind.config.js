/** @type {import('tailwindcss').Config} */
export default {
  content: ["./public/*.html", "./src/**/*.{js,jsx,ts,tsx,css}"],
  // Shadow DOM provides isolation - no need to disable preflight or use important!
  theme: {
    extend: {
      colors: {
        primary: "#667eea",
        secondary: "#764ba2",
      },
      gradients: {
        "gradient-primary": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
    },
  },
  plugins: [],
};
