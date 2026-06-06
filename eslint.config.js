import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: ["node_modules/**", "coverage/**", "public/**/*.html"]
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      "no-console": "off"
    }
  },
  {
    files: [
      "public/assets/js/frontend-app.js",
      "public/assets/js/api/**/*.js",
      "public/assets/js/components/**/*.js",
      "public/assets/js/pages/**/*.js",
      "public/assets/js/router/**/*.js",
      "public/assets/js/services/**/*.js",
      "public/assets/js/state/**/*.js",
      "public/assets/js/utils/**/*.js"
    ],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser
      }
    },
    rules: {
      "no-irregular-whitespace": "off",
      "no-redeclare": "off",
      "no-undef": "off",
      "no-unused-vars": "off"
    }
  }
];
