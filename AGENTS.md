# AGENTS.md - AI Agent Guidelines

This document provides guidance for AI coding agents working on the vscode-verilog-hdl-support project.

## Project Overview

This is a VS Code extension providing HDL (Hardware Description Language) support including:
- **Syntax highlighting** for Verilog, SystemVerilog, Bluespec SystemVerilog (BSV), VHDL, Verilog-AMS, UCF, SDC, XDC, UPF, Tcl, and Verilog filelists
- **Linting** via external tools (iverilog, verilator, modelsim, xvlog, slang, verible-verilog-lint)
- **Language Server** integration (svls, veridian, hdl_checker, verible-verilog-ls, vhdl_ls, tclsp)
- **Formatting** support (verilog-format, istyle-verilog-formatter, verible-verilog-format)
- **Ctags integration** for symbols, hover, definitions, and completions
- **VCD waveform viewer** (Fliplot)

## Repository Structure

```
src/
├── extension.ts          # Extension entry point, activates all features
├── extensionManager.ts   # Manages extension lifecycle and version updates
├── logger.ts             # Hierarchical logging utility
├── ctags.ts              # Ctags integration for symbol parsing
├── hover.ts              # Hover information utilities
├── BsvProvider.ts        # Bluespec SystemVerilog support
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
│   └── plugins/          # Linter plugins
├── languageServer/       # Language server client management
│   ├── index.ts          # Exports init/stop functions
│   ├── definitions.ts    # Language server definitions
│   ├── manager.ts        # Manages multiple language server clients
│   └── tclspOptions.ts   # Tcl language server options
├── fliplot/              # VCD waveform viewer
│   ├── FliplotPanel.ts   # Webview panel implementation
│   └── FliplotCustomEditor.ts  # Custom editor for VCD files
├── bsvLanguageServer/    # BSV language support
└── test/                 # Test files (see Testing section)

syntaxes/                 # TextMate grammar files (.tmLanguage.json/.yaml)
configs/                  # Language configuration files
snippets/                 # Code snippets for each language
media/fliplot/            # Fliplot web assets
language_examples/        # Example HDL files for testing
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
npm run compile         # Full build (TypeScript + esbuild bundling)
npm run watch           # Watch mode for development
npm run watch:tsc       # Watch TypeScript compilation only
npm run watch:esbuild   # Watch esbuild bundling only
```

### Development Workflow
1. Run `npm run watch` or use the VS Code task "watch" (Ctrl+Shift+B)
2. Press F5 to launch the Extension Development Host
3. Make changes and reload the Extension Development Host to test

## Build System

- **TypeScript**: Compiled with `tsc` to `out/` directory (type checking)
- **esbuild**: Bundles to `dist/extension.js` (the actual extension entry point)
- **Entry point**: `src/extension.ts` → bundled to `dist/extension.js`
- **Config**: `tsconfig.json` (strict mode enabled)

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
- `bsv.test.ts` - Bluespec SystemVerilog tests
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
- Use the `Logger` class for logging (see `src/logger.ts`)
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

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Build and test
4. Package with `vsce package`

## Important Files

- `package.json` - Extension manifest, commands, configuration schema
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `esbuild.js` - Build script for bundling
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines

## Dependencies

### Runtime
- `vscode-languageclient` - Language Server Protocol client
- `antlr4ts` - ANTLR4 runtime for BSV parsing
- `semver` - Version comparison
- `which` - Executable path resolution
- `js-yaml` - YAML parsing (for syntaxes)

### Development
- `typescript` - TypeScript compiler
- `esbuild` - Fast bundler
- `eslint` + plugins - Linting
- `@vscode/test-electron` - VS Code extension testing
