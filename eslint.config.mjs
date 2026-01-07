import typescriptEslint from "typescript-eslint";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const compat = new FlatCompat({
    baseDirectory: dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    // Ignore patterns
    {
        ignores: [
            "**/out/**",
            "**/dist/**",
            "**/*.d.ts",
            "src/bsvjs/syntaxes/**",
            "src/BsvProvider.ts",
            "node_modules/**",
        ],
    },
    // Base JavaScript recommended rules
    js.configs.recommended,
    // TypeScript configuration
    {
        files: ["**/*.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslint.plugin,
        },
        languageOptions: {
            parser: typescriptEslint.parser,
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
                project: "./tsconfig.json",
            },
            globals: {
                ...globals.node,
            },
        },
        rules: {
            // TypeScript-specific rules
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],
            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-non-null-assertion": "warn",

            // General code quality rules
            curly: "warn",
            eqeqeq: ["warn", "always"],
            "no-throw-literal": "warn",
            semi: ["warn", "always"],
            "no-unused-vars": "off", // Use @typescript-eslint/no-unused-vars instead
            "no-undef": "off", // TypeScript handles this
            "no-console": "warn",
            "no-debugger": "warn",
            "no-duplicate-imports": "warn",
            "no-var": "warn",
            "prefer-const": "warn",
            "prefer-template": "warn",
            "no-else-return": "warn",
            "no-lonely-if": "warn",
            "no-useless-return": "warn",
            "object-shorthand": ["warn", "always"],
            "arrow-body-style": ["warn", "as-needed"],
        },
    },
    // Test files - relaxed rules with Mocha globals
    {
        files: ["**/test/**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.mocha,
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "no-console": "off",
        },
    },
];