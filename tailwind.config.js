/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Orange accent colors from icon (bright orange → reddish-orange gradient)
        accent: {
          50: "#FFF7ED", // Lightest orange tint
          100: "#FFEDD5", // Very light orange
          200: "#FED7AA", // Light orange
          300: "#FDBA74", // Medium-light orange
          400: "#FB923C", // Medium orange
          500: "#F97316", // Base orange (primary accent)
          600: "#EA580C", // Dark orange
          700: "#C2410C", // Darker orange
          800: "#9A3412", // Very dark orange
          900: "#7C2D12", // Darkest orange
          950: "#431407", // Deepest orange
        },
        // Zinc backgrounds for dark theme
        background: {
          DEFAULT: "#18181B", // zinc-900 (primary background)
          secondary: "#27272A", // zinc-800 (secondary surfaces)
          tertiary: "#3F3F46", // zinc-700 (elevated surfaces)
          inverse: "#FAFAFA", // zinc-50 (for light mode if needed)
        },
        // Text colors
        text: {
          DEFAULT: "#FAFAFA", // zinc-50 (primary text)
          secondary: "#A1A1AA", // zinc-400 (secondary text)
          tertiary: "#71717A", // zinc-500 (tertiary text)
          muted: "#52525B", // zinc-600 (muted text)
          inverse: "#18181B", // zinc-900 (for light backgrounds)
        },
        // Border colors
        border: {
          DEFAULT: "#3F3F46", // zinc-700 (default borders)
          light: "#52525B", // zinc-600 (lighter borders)
          dark: "#27272A", // zinc-800 (darker borders)
        },
        // Status colors (keeping existing driver colors but adding to tokens)
        status: {
          success: "#10B981", // green-500
          warning: "#F59E0B", // amber-500
          error: "#EF4444", // red-500
          info: "#3B82F6", // blue-500
        },
      },
      // Spacing tokens
      spacing: {
        xs: "0.5rem", // 8px
        sm: "0.75rem", // 12px
        md: "1rem", // 16px
        lg: "1.5rem", // 24px
        xl: "2rem", // 32px
        "2xl": "3rem", // 48px
        "3xl": "4rem", // 64px
      },
      // Border radius tokens
      borderRadius: {
        xs: "0.25rem", // 4px
        sm: "0.5rem", // 8px
        md: "0.75rem", // 12px
        lg: "1rem", // 16px
        xl: "1.5rem", // 24px
        full: "9999px",
      },
      // Typography tokens
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
        base: ["1rem", { lineHeight: "1.5rem" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
    },
  },
  plugins: [],
};
