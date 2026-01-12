# AGENTS.md - AI Agent Guidelines

This document provides guidance for AI coding agents working on the vscode-verilog-hdl-support project.

## Project Overview

This is a VS Code extension providing HDL (Hardware Description Language) support including:
- **Syntax highlighting** for Verilog, SystemVerilog, VHDL, Verilog-AMS, UCF, SDC, XDC, UPF, Tcl, Verilog filelists, and VCD
- **Linting** via external tools (iverilog, verilator, modelsim, xvlog, slang, verible-verilog-lint)
- **Language Server** integration (svls, veridian, hdl_checker, verible-verilog-ls, vhdl_ls, tclsp)
- **Formatting** support (verilog-format, istyle-verilog-formatter, verible-verilog-format)
- **Ctags integration** for symbols, hover, definitions, and completions
- **VCD waveform viewer** via a VS Code Custom Editor (Fliplot)

The source of truth for “what the extension supports” is `package.json` under `contributes.*`.

## Repository Structure

```
src/
├── extension.ts          # Extension entry point, activates all features
├── extensionManager.ts   # Manages extension lifecycle and version updates
├── logging.ts            # LogTape logging bootstrap + helpers
├── logtape-vscode-sink.ts# LogTape sink implementation for VS Code Output
├── constants.ts          # Shared constants
├── ctags.ts              # Ctags integration for symbol parsing
├── hover.ts              # Legacy/utility hover helpers (providers are in providers/)
├── commands/             # VS Code command implementations
│   └── ModuleInstantiation.ts
├── providers/            # VS Code language feature providers
│   ├── CompletionItemProvider.ts
│   ├── DefinitionProvider.ts
│   ├── DocumentSymbolProvider.ts
│   ├── FormatProvider.ts
│   └── HoverProvider.ts
├── linter/               # Linting infrastructure
│   ├── BaseLinter.ts     # Abstract base class for linters
│   ├── LintManager.ts    # Manages linter selection and execution
│   ├── IcarusLinter.ts   # iverilog linter
│   ├── VerilatorLinter.ts
│   ├── ModelsimLinter.ts
│   ├── SlangLinter.ts
│   ├── VeribleVerilogLintLinter.ts
│   ├── XvlogLinter.ts
├── languageServer/       # Language server client management
│   ├── index.ts          # Exports init/stop functions
│   ├── definitions.ts    # Language server definitions
│   ├── manager.ts        # Manages multiple language server clients
│   └── tclspOptions.ts   # Tcl language server options
├── fliplot/              # VCD waveform viewer
│   ├── FliplotPanel.ts   # Webview panel implementation
│   └── FliplotCustomEditor.ts  # Custom editor for VCD files
└── test/                 # Test files (see Testing section)

syntaxes/                 # TextMate grammar files (.tmLanguage.json/.yaml)
configs/                  # Language configuration files
snippets/                 # Code snippets for each language
media/fliplot/            # Fliplot web assets
language_examples/        # Example HDL files for testing
surfer/                   # Waveform tooling/assets (used by Fliplot)
```

## Development Setup

### Prerequisites
- Node.js (LTS version recommended)
- npm

### Installation
```bash
npm install
```

### Build Commands
```bash
npm run compile         # Typecheck + lint + esbuild bundle
npm run watch           # Watch mode for development
npm run watch:tsc       # Watch TypeScript compilation only
npm run watch:esbuild   # Watch esbuild bundling only
npm run package         # Production bundle (used for VSIX publish)
npm run compile-tests   # Compile test sources to out/
npm run pretest         # Compile-tests + bundle + lint
npm run syntax          # Regenerate syntaxes/systemverilog.tmLanguage.json from YAML
```

### Development Workflow
1. Run `npm run watch` or use the VS Code task "watch" (Ctrl+Shift+B)
2. Press F5 to launch the Extension Development Host
3. Make changes and reload the Extension Development Host to test

## Build System

- **TypeScript**: Used primarily for type checking during dev (`tsc --noEmit`). Tests are compiled to `out/` via `npm run compile-tests`.
- **esbuild**: Bundles the extension entry point to `dist/extension.js` (the actual extension entry point)
- **Entry point**: `src/extension.ts` → bundled to `dist/extension.js`
- **Config**: `tsconfig.json` (strict mode enabled)

## Contributes Surface (Complete)

The extension’s user-facing surface is defined in `package.json` under `contributes.*`.

### Language IDs

The contributed language IDs are:

- `verilog`
- `verilogams`
- `systemverilog`
- `vhdl`
- `ucf`
- `sdc`
- `tcl`
- `upf`
- `xdc`
- `verilog-filelist`
- `wavedump` (for `.vcd`)

### Grammars / Scopes

TextMate grammars (and key scopes) are contributed via `contributes.grammars`:

- `verilog` → `source.verilog` → `syntaxes/verilog.tmLanguage.json`
- `verilogams` → `source.verilogams` → `syntaxes/verilogams.tmLanguage.json`
- `systemverilog` → `source.systemverilog` → `syntaxes/systemverilog.tmLanguage.json`
- `vhdl` → `source.vhdl` → `syntaxes/vhdl.tmLanguage.json`
- `ucf` → `source.ucfconstraints` → `syntaxes/ucf.tmLanguage.json`
- `sdc` → `source.sdc` → `syntaxes/sdc.tmLanguage.json`
- `tcl` → `source.tcl` → `syntaxes/tcl.tmlanguage.json`
- `upf` → `source.tcl` → `syntaxes/tcl.tmlanguage.json` (shares Tcl scope)
- `xdc` → `source.sdc` → `syntaxes/sdc.tmLanguage.json` (shares SDC scope)
- `verilog-filelist` → `source.verilog-filelist` → `syntaxes/verilog-filelist.tmLanguage.json`

Markdown codeblock injection grammar:

- `syntaxes/codeblock.json` injects into `text.html.markdown` and embeds Verilog/SystemVerilog blocks.

Note: `syntaxes/systemverilog.tmLanguage.yaml` is a source file; the contributed grammar is the generated JSON.

### Commands

Contributed commands:

- `verilog.instantiateModule` — Instantiate Module
- `verilog.lint` — Rerun lint tool
- `verilog.openFliplot` — Open Fliplot Waveform Viewer

### Custom Editors

- `verilog.fliplotEditor` registered for `*.vcd` (default priority)

### Snippets

Snippets are contributed under:

- `snippets/verilog.json`
- `snippets/verilogams.json`
- `snippets/systemverilog.json`

### Settings / Configuration

Settings live under `contributes.configuration` and are grouped by:

- `verilog.ctags.*`
- `verilog.formatting.*`
- `verilog.linting.*`
- `verilog.languageServer.*`

## Testing

### Running Tests
```bash
npm test                # Run all tests
npm run pretest         # Compile + lint before testing
```

### Test Structure
Tests are located in `src/test/` and use VS Code's test framework:
- `extension.test.ts` - Basic extension tests
- `ctags.test.ts` - Ctags functionality
- `format.test.ts` - Formatting tests
- `hover.test.ts` - Hover provider tests
- `iverilog.test.ts`, `verilator.test.ts`, `verible-verilog-lint.test.ts` - Linter tests
- `languageServer.test.ts` - Language server tests
- `moduleInstantiation.test.ts` - Module instantiation command tests
- `tclsp.test.ts` - Tcl language server tests

## Code Style

### Linting
```bash
npm run lint           # Run ESLint
```

### Formatting
- Use **Prettier** as the default formatter for TypeScript
- Use **ESLint** for code quality
- Enable "Format on Save" in VS Code

### ESLint Rules
- Uses TypeScript ESLint parser
- Key rules: `curly`, `eqeqeq`, `no-throw-literal`, `semi`
- Import naming convention: camelCase or PascalCase

### Conventions
- All source files should have `// SPDX-License-Identifier: MIT` header
- Use LogTape via `getExtensionLogger()` (see `src/logging.ts`)
- Providers follow VS Code's provider pattern
- Linters extend `BaseLinter` abstract class

## Key Patterns

### Adding a New Linter
1. Create a new file in `src/linter/` extending `BaseLinter`
2. Implement `convertToSeverity()` and `lint()` methods
3. Register in `LintManager.ts`
4. Add configuration options in `package.json` under `contributes.configuration`

### Adding a New Language Server
1. Add server definition in `src/languageServer/definitions.ts`
2. Add configuration options in `package.json`
3. The `LanguageServerManager` handles lifecycle automatically

### Adding a New Provider
1. Create provider class implementing VS Code's provider interface
2. Register in `src/extension.ts` using `context.subscriptions.push()`

## Configuration

Extension settings are defined in `package.json` under `contributes.configuration`:
- `verilog.ctags.*` - Ctags settings
- `verilog.linting.*` - Linter settings
- `verilog.formatting.*` - Formatter settings
- `verilog.languageServer.*` - Language server settings

## Release Process

This repo uses a tag-driven publish workflow.

1. Update version in `package.json`
2. Update `CHANGELOG.md` (and any other release notes expected by contributors)
3. Push a Git tag (e.g. `vX.Y.Z`)
4. GitHub Actions publishes on tag push via `.github/workflows/publish-marketplace.yml` (Open VSX + VS Marketplace)

CI packaging:

- `.github/workflows/ci.yml` runs tests on PR/push, runs `npx @vscode/vsce package`, and uploads the VSIX artifact on Linux.

## Important Files

- `package.json` - Extension manifest, commands, configuration schema
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `esbuild.js` - Build script for bundling
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines
- `.github/workflows/ci.yml` - CI tests + VSIX packaging artifact
- `.github/workflows/publish-marketplace.yml` - Tag-driven publishing workflow

## Dependencies

### Runtime
- `vscode-languageclient` - Language Server Protocol client
- `semver` - Version comparison
- `which` - Executable path resolution
- `js-yaml` - YAML parsing (for syntaxes)

### Development
- `typescript` - TypeScript compiler
- `esbuild` - Fast bundler
- `eslint` + plugins - Linting
- `@vscode/test-electron` - VS Code extension testing
