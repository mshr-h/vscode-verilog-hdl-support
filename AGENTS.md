# AGENTS.md - Coding Agent Guide

This repository is a VS Code HDL extension. For user-facing feature descriptions,
use `README.md`. For the exact contributed languages, commands, grammars,
snippets, settings, and custom editors, use `package.json` under
`contributes.*`; do not duplicate that surface here.

## Codebase Map

- `src/extension.ts` - extension activation and registration for providers,
  commands, linting, Fliplot, and language servers.
- `src/commands/` - command implementations, including Doctor and module
  instantiation.
- `src/providers/` - VS Code language feature providers.
- `src/linter/` - lint orchestration, diagnostics, run coordination, and linter
  implementations.
- `src/languageServer/` - language server definitions, options, and lifecycle
  management.
- `src/tools/` - shared external-tool execution and WSL path conversion helpers.
- `src/utils/` - shared path, config, and workspace helpers.
- `src/fliplot/` and `media/fliplot/` - VCD viewer integration and web assets.
- `syntaxes/`, `configs/`, and `snippets/` - language grammars,
  configurations, and snippets.
- `src/test/` - VS Code extension tests.

## Agent Commands

Use these commands when they are relevant to the change:

```bash
npm run compile
npm run lint
npm run check-types
npm run compile-tests
npm test
npm run syntax
```

`npm test` uses `vscode-test`, which needs network access to resolve or download
the VS Code test runner and needs to launch VS Code outside the sandbox. Always
run `npm test` with network/escalated access and report the exact result.

For targeted validation, prefer the narrowest command that covers the changed
behavior. Use broader validation when touching shared linting, language server,
activation, or process-running behavior.

## Implementation Patterns

- Linters extend `BaseLinter`, are selected by `LintManager`, coordinate runs
  through `LintRunManager`, publish diagnostics through
  `LinterDiagnosticManager`, and execute external tools through `ToolRunner`.
- Language servers are defined in `src/languageServer/definitions.ts`; the
  manager handles lifecycle and configuration changes.
- Providers and commands are registered from `src/extension.ts`.
- Doctor behavior lives in `src/commands/Doctor.ts` and should diagnose
  configured tools without mutating user HDL files.
- User-facing contribution changes must be reflected in `package.json`
  `contributes.*`; update tests and docs only where they add non-duplicated
  value.

## Source Conventions

- Add `// SPDX-License-Identifier: MIT` to new source files.
- Use LogTape through `getExtensionLogger()` instead of ad hoc output.
- Prefer existing helper APIs and local patterns over new abstractions.
- Keep changes focused; avoid unrelated refactors or generated churn.
- Do not directly hand-edit generated `syntaxes/systemverilog.tmLanguage.json`.
  Edit `syntaxes/systemverilog.tmLanguage.yaml` and run `npm run syntax`.
- Preserve existing user or contributor changes in the worktree. Do not revert
  unrelated files.

## Release Process

This repo uses tag-driven publishing.

- Update `package.json` version and `CHANGELOG.md` (and any other release notes expected by contributors).
- Do not push a version tag automatically. Ask the user before creating or
  pushing a tag such as `vX.Y.Z`.
- `.github/workflows/publish-marketplace.yml` publishes to Open VSX and the VS
  Code Marketplace on tag push.
- `.github/workflows/ci.yml` runs tests and packaging on PRs and pushes, and
  uploads the Linux VSIX artifact.

## Testing Notes

- Tests are compiled to `out/` with `npm run compile-tests`.
- VS Code test runner configuration lives in `.vscode-test.mjs`; Windows-focused
  tests use `.vscode-test.windows.mjs`.
- WSL2 integration tests are gated by `VERILOGHDL_RUN_WSL2_TESTS`.
- Documentation-only edits normally do not require the full test suite, but
  still review the final diff for accuracy against `README.md`, `package.json`,
  `src/extension.ts`, and the current source layout.
