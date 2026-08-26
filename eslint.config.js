import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      // Generated from the API's OpenAPI schema — never hand-edited.
      "src/types/api.ts",
      // shadcn/ui primitives are generated and extended by composition.
      "src/components/ui/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Dates go through src/lib/dates.ts. The business day rolls over at
      // 05:00 IST, so any date derived inline in feature code is wrong.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.callee.name='Date'][callee.property.name='toISOString']",
          message:
            "Do not derive dates inline. Use src/lib/dates.ts — the business day rolls over at 05:00 IST, not midnight.",
        },
      ],
    },
  },
  {
    // Config files are plain JS and have no type information to lint against.
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["**/*.test.{ts,tsx}", "src/test/**"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
);
