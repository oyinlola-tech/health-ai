export default {
  content: ["./public/**/*.html", "./public/assets/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        primary: "#2B2724",
        muted: "#A19890",
        coral: "#FF6E5C",
        background: "#FDF6F3",
        surface: "#FFFFFF"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Spectral", "Georgia", "serif"]
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem"
      }
    }
  },
  plugins: []
};
