export default {
  content: ["./public/**/*.html", "./public/assets/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        primary: "#2B2724",
        secondary: "#A19890",
        accent: "#FF6E5C",
        background: "#FDF6F3",
        surface: "#FFFFFF"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Spectral", "Georgia", "serif"]
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.625rem",
        md: "1.125rem",
        lg: "1.75rem"
      },
      spacing: {
        sm: "8px",
        md: "16px",
        lg: "32px"
      }
    }
  },
  plugins: []
};
