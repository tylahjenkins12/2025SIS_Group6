import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "server.js",  // Node.js server file uses require()
      "*.config.mjs",  // Config files
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",  // Allow any for now
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "react/no-unescaped-entities": "off",  // Allow apostrophes in text
      "react-hooks/exhaustive-deps": "warn",  // Warn instead of error
      "import/no-anonymous-default-export": "off",  // Allow in config files
    },
  },
];

export default eslintConfig;
