/** @type {import('tailwindcss').Config} */
export default {
  // 1. Tell Tailwind to scan all React files in the src folder
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  // 2. CRITICAL FOR MUI: This ensures Tailwind classes always override MUI's default styles
  important: "#root",

  theme: {
    extend: {
      // You can define your GearGrid brand colors here later if you want!
      colors: {
        brand: {
          blue: "#2563eb",
          dark: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};
