# HDL support for VS Code <img src="images/icon.png" alt="HDL support for VS Code icon" width="56" style="vertical-align: middle;" />

HDL support for VS Code with syntax highlighting, snippets, linting, formatting, slang-server-powered SystemVerilog intelligence, waveform viewing, and selected language-server integration for non-SystemVerilog languages.

[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/10949/badge)](https://www.bestpractices.dev/projects/10949)
[Ask DeepWiki](https://deepwiki.com/mshr-h/vscode-verilog-hdl-support)

![sample](images/sample.gif)

## Installation

Install it from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=mshr-h.VerilogHDL) or [Open VSX Registry](https://open-vsx.org/extension/mshr-h/veriloghdl).

## Quick Start

Syntax highlighting, snippets, basic editor integration, inactive preprocessor highlighting, and waveform opening work immediately after installation.

SystemVerilog language intelligence is provided by `slang-server`. Configure a native executable when your build does not include bundled WASM:

```json
{
    "verilog.slangServer.enabled": true,
    "verilog.slangServer.runtime": "native",
    "verilog.slangServer.path": "/path/to/slang-server"
}
```

Use **Verilog: Configure Slang Project** to create a workspace `.slang/server.json` from a filelist. slang-server owns project indexing, builds, top level, diagnostics, navigation, completion, hover, references, rename, symbols, hierarchy, and HDL Explorer data.

Linting is separate from slang-server LSP support and is disabled by default. Pick a file-mode linter after installing the external tool:

```json
{
    "verilog.linting.linter": "verilator"
}
```

Use **Verilog: Doctor** from the command palette to inspect slang-server runtime status, `.slang/server.json`, external tool paths, formatter setup, linter configuration, and retained Tcl/VHDL language-server setup.

## Features

- Syntax highlighting and language modes for HDL, constraint, script, filelist, and waveform files.
- SystemVerilog and Verilog intelligence through `slang-server` LSP.
- `.slang/server.json` project configuration creation, opening, validation, and Doctor reporting.
- HDL Explorer backed by slang-server commands for modules, scopes, hierarchy, build file, and top-level actions.
- Inactive Verilog/SystemVerilog preprocessor region highlighting from explicitly configured defines.
- VCD waveform viewer integration with embedded [Fliplot](https://github.com/raczben/fliplot) and optional [Vaporview](https://marketplace.visualstudio.com/items?itemName=lramseyer.vaporview).
- File-mode linting support for Icarus Verilog, ModelSim, Verilator, Vivado `xvlog`, Slang, and Verible Verilog Lint.
- Formatting support from `verilog-format`, `iStyle`, and `verible-verilog-format`.
- Optional language-server integration for VHDL, Tcl, SDC, XDC, and UPF.

## Supported Languages and File Types

| Language / file type | Extensions / usage | Notes |
| --- | --- | --- |
| Verilog-HDL | `.v`, `.vh`, `.vl` | Syntax highlighting, snippets, formatting, linting, and slang-server intelligence |
| SystemVerilog | `.sv`, `.svh`, `.SV` | Syntax highlighting, snippets, formatting, linting, and slang-server intelligence |
| Verilog-AMS | `.vams`, `.va` | Syntax highlighting and Verilog snippets |
| VHDL | `.vhd`, `.vhdl`, `.vho` | Syntax highlighting and optional `vhdl_ls` support |
| UCF constraints | `.ucf` | Syntax highlighting |
| SDC constraints | `.sdc` | Syntax highlighting and optional `tclsp` support |
| XDC constraints | `.xdc` | Syntax highlighting and optional `tclsp` support |
| Tcl | `.tcl`, `.tm`, `.tk` | Syntax highlighting and optional `tclsp` support |
| UPF | `.upf` | Tcl-based syntax highlighting and optional `tclsp` support |
| Verilog filelists | `.f` | Filelist language mode and Slang project config input |
| VCD waveform dumps | `.vcd` | Open with **Verilog: Open Waveform** |
| Markdown fenced code blocks | `verilog` / `systemverilog` | Embedded highlighting in Markdown |

## Commands

- **Verilog: Restart slang-server**

    Restart the managed slang-server language client.

- **Verilog: Show slang-server Output**

    Open the `Verilog slang-server` output channel.

- **Verilog: Show slang-server Status**

    Show the current slang-server runtime, state, and startup error if one exists.

- **Verilog: Select slang-server Runtime**

    Switch between `auto`, bundled WASM, and a native `slang-server` executable. Native mode prompts for an executable path.

- **Verilog: Configure Slang Project**

    Search the workspace for common filelists and generate `.slang/server.json`.

- **Verilog: Open Slang Project Config**

    Open the workspace `.slang/server.json`, or offer to create one when it is missing.

- **Verilog: Validate Slang Project Config**

    Validate that the workspace `.slang/server.json` is valid JSON.

- **Verilog: Refresh HDL Explorer**

    Refresh the slang-backed HDL Explorer tree view.

- **Verilog: Set slang-server Build File**

    Pick a filelist and send `slang.setBuildFile` to slang-server.

- **Verilog: Set slang-server Top Level**

    Send `slang.setTopLevel` using the selected Explorer module or active HDL editor path.

- **Verilog: Instantiate Module**

    Select a module from slang-server and insert the instantiation snippet returned by LSP completion.

- **Verilog: Rerun lint tool**

    Choose a lint tool from the list and run it manually on the active file.

- **Verilog: Doctor**

    Diagnose slang-server, Slang project config, retained language servers, linter, and formatter setup without modifying HDL files.

- **Verilog: Open Waveform**

    Open a VCD waveform file with the configured waveform viewer. By default, this command uses Vaporview when the `lramseyer.vaporview` extension is installed and falls back to the embedded Fliplot viewer otherwise.

- **Verilog: Open Fliplot Waveform Viewer**

    Open the embedded Fliplot waveform viewer and load a VCD file.

## Using slang-server

The extension uses slang-server as the only project-aware Verilog/SystemVerilog intelligence engine. The previous TypeScript-side project index, hierarchy inference, fallback navigation, and module-instantiation scanner are no longer active; module instantiation snippets come from slang-server LSP completion.

Runtime settings:

```json
{
    "verilog.slangServer.enabled": true,
    "verilog.slangServer.runtime": "auto",
    "verilog.slangServer.path": "",
    "verilog.slangServer.args": "",
    "verilog.slangServer.trace.server": "off",
    "verilog.slangServer.wasm.memoryLimitMb": 2048
}
```

Set `verilog.slangServer.runtime` to `native` and `verilog.slangServer.path` to a native `slang-server` executable when native mode is desired. `auto` selects native only when a path is configured; builds that include a bundled WASM artifact can use bundled WASM without a native install.

The status bar shows the active state as `slang-server: WASM`, `slang-server: native`, `slang-server: stopped`, or `slang-server: error`. Click it for quick actions: restart, show output, open config, select runtime, or run Doctor.

### Rebuilding bundled slang-server.wasm

Maintainers can rebuild the bundled WASM artifact on macOS or Linux:

```sh
npm run build:slang-wasm
npm run verify:wasm-bundle
```

The build is pinned by `build/slang-server.lock.json`. The script checks out the locked `hudson-trading/slang-server` commit, verifies the locked `external/slang` submodule commit, uses WASI SDK 25.0, builds with CMake/Ninja, and writes:

- `resources/wasm/slang-server.wasm`
- `resources/wasm/slang-server.meta.json`
- `resources/wasm/licenses/*`

`slang-server.wasm` and `slang-server.meta.json` are generated release artifacts and are not tracked in Git. The lock file, build scripts, and license notices are tracked; CI builds and uploads the artifact for packaging.

Set `WASI_SDK_PATH` to use an existing WASI SDK install; the version must match the lock file. GitHub Actions builds the same artifact on Ubuntu and uploads it as `slang-server-wasm`. The workflow does not commit the binary automatically.

The production bundled runtime uses the Microsoft VS Code WASM/WASI language-server path through `@vscode/wasm-wasi` and `@vscode/wasm-wasi-lsp`. The extension includes `ms-vscode.wasm-wasi-core` in its extension pack so the WASM WASI Core provider is installed with the extension without blocking activation. Maintainers can temporarily force the legacy Node helper with `VERILOGHDL_SLANG_WASM_RUNTIME=node` when debugging runtime differences.

Before publishing a VSIX, run:

```sh
npm run package
npm run verify:vsix -- veriloghdl-*.vsix
```

`npm run package` fails if the bundled WASM artifact, metadata, or license notices are missing.

## Slang Project Configuration

slang-server reads project configuration from:

- workspace `.slang/server.json`
- user `~/.slang/server.json`
- workspace `.slang/local/server.json`

A typical workspace config is:

```json
{
  "flags": "-f rtl/files.f",
  "index": [
    {
      "dirs": ["rtl", "tb"],
      "excludeDirs": ["build", "sim", "node_modules"]
    }
  ],
  "build": "rtl/files.f"
}
```

Use `flags` for normal slang command-line flags, `index` for directories slang-server should index, and `build`, `buildPattern`, or `builds` when your workspace has one or more build files. **Verilog: Configure Slang Project** creates a starter config from an existing filelist and opens it for review.

## HDL Explorer

The **HDL Explorer** view appears in VS Code's Explorer sidebar when `verilog.hdlExplorer.enabled` is enabled. It is powered by slang-server custom commands, so modules and hierarchy require a running slang-server and a build file or top level known to slang-server.

The Explorer shows slang-server status, Slang config summary, modules, and hierarchy. Build/top actions are sent to slang-server; missing data is shown as an unavailable state rather than falling back to TypeScript-side parsing.

## Linting

All linters expect the executable binary (`iverilog`, `verilator`, and so on) to be present in the `PATH` environment variable, unless otherwise specified.

```json
{
    "verilog.linting.linter": "verilator"
}
```

Automatic linting runs for Verilog/SystemVerilog files when they are opened or saved and a linter other than `none` is configured. Use `verilog.linting.runOnOpen` and `verilog.linting.runOnSave` to control these triggers independently. Linting is file-mode only; project-wide semantic diagnostics come from slang-server.

While using ``include` directives, the path to included files should be relative to the workspace directory unless `runAtFileLocation` is enabled for the selected linter.

## Inactive Preprocessor Regions

Inactive Verilog/SystemVerilog preprocessor branches controlled by ``ifdef`, ``ifndef`, ``elsif`, ``else`, and ``endif` are highlighted in the editor. The decoration helper uses macros defined in the current document plus workspace-wide macros configured in `verilog.preprocessor.defines`.

```json
{
    "verilog.preprocessor.defines": ["SIMULATION", "USE_VENDOR_IP"],
    "verilog.preprocessor.inactiveCode.enabled": true,
    "verilog.preprocessor.inactiveCode.opacity": 0.45,
    "verilog.preprocessor.inactiveCode.foregroundColor": "",
    "verilog.preprocessor.inactiveCode.backgroundColor": "rgba(255, 0, 0, 0.12)"
}
```

Leave `foregroundColor` or `backgroundColor` empty to use the theme/default styling. This feature is a lightweight editor aid and does not replace slang-server preprocessing or semantic analysis.

## Language Servers

slang-server owns Verilog/SystemVerilog intelligence. The retained auxiliary language-server manager is for non-Verilog languages:

| Language Server | Document languages |
| --- | --- |
| [vhdl_ls](https://github.com/VHDL-LS/rust_hdl) | VHDL |
| [tclsp](https://github.com/nmoroze/tclint) | Tcl, SDC, XDC, UPF |

Install [vhdl_ls](https://github.com/VHDL-LS/rust_hdl) via `cargo`:

```sh
cargo install vhdl_ls
```

Tcl support is provided by [tclsp](https://github.com/nmoroze/tclint). Configure it under `verilog.languageServer.tclsp` and install `tclint`, which provides the `tclsp` binary:

```sh
uv tool install tclint
```

## Formatting

We currently support document formatting for Verilog-HDL and SystemVerilog files with the following formatters.

| Formatter | Verilog-HDL | SystemVerilog |
| --- | --- | --- |
| [verilog-format](https://github.com/ericsonj/verilog-format) | Yes | No |
| [thomasrussellmurphy/istyle-verilog-formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter) | Yes | No |
| [verible-verilog-format](https://github.com/chipsalliance/verible) | Yes | Yes |

You can format the current file by typing `Ctrl-Shift-p`, then selecting `Format Document`. Entire file formatting is supported. Selected range formatting is not supported yet. All formatting settings are under the `verilog.formatting` namespace.

The `verilog.formatting.verilogFormat.settings` path supports `${env:VAR}` and `~` expansion, so values such as `${env:HOME}/.verilog-format.properties` and `~/.verilog-format.properties` can be used.

## Troubleshooting slang-server

- **WASM startup failure**: run **Verilog: Doctor** and **Verilog: Show slang-server Output**. Missing `resources/wasm/slang-server.wasm`, VS Code Web, virtual workspaces, or non-file workspace folders prevent bundled WASM startup. If the output shows `bad_alloc`, increase `verilog.slangServer.wasm.memoryLimitMb` or switch to native. Use **Verilog: Select slang-server Runtime** to switch to native when needed.
- **Native path invalid**: set `verilog.slangServer.path` to the native `slang-server` executable or choose **Verilog: Select slang-server Runtime** and pick **Native executable**.
- **No `.slang/server.json`**: run **Verilog: Configure Slang Project**. The first SystemVerilog file opened in a workspace without config offers this action once, with a local “Don’t Show Again” option.
- **Large project performance**: prefer a precise `.slang/server.json` with filelists and focused `index.dirs`. Switch to native runtime for performance-sensitive workspaces.
- **Workspace path or include path issues**: verify filelist paths are relative to the workspace config, check `flags`, `build`, and `index` entries, then rerun Doctor.

The extension does not send telemetry. slang-server diagnostics remain local in VS Code notifications, the status bar, Doctor, and the `Verilog slang-server` output channel.

## Limitations

- Verilog/SystemVerilog project-aware intelligence requires slang-server.
- Bundled WASM startup depends on a build that includes the WASM artifact; configure native `slang-server` when it is not bundled.
- File-mode linting remains separate from slang-server diagnostics.
- Formatting supports whole-document formatting. Range formatting is not supported.

## [Guidelines for Contributing](./CONTRIBUTING.md)

## Extension Development

### Launch in Debug Mode

1. Install dependencies with `npm install`.
2. Open the repository in VS Code and start the default build task (`watch`) or simply press `F5`—the `Launch Extension` configuration in [.vscode/launch.json](.vscode/launch.json) will install `ms-vscode.wasm-wasi-core` into `.vscode-dev/extensions` and run the build task automatically.
3. In the Run and Debug view, pick **Launch Extension** and start debugging. VS Code will open an Extension Development Host pointing at the bundled `language_examples` workspace so you can try the features immediately.
4. Set breakpoints in the `src` files; the compiled output in `out` is mapped via sourcemaps so the breakpoints hit your TypeScript sources.

### Logs

Logs are written to a LogOutputChannel in VS Code. You can check them by opening the **Output** pane in VS Code and choosing _Verilog_ in the drop-down menu.

## Helpful links

- [Verilog in VSCode With Linting (Using Modelsim) - YouTube](https://www.youtube.com/watch?v=-DTGf3Z6v_o)
- [A Productive VSCode Setup for SystemVerilog Development - Igor Freire](https://igorfreire.com.br/2023/06/18/vscode-setup-for-systemverilog-development/)

## Thanks

Third-party syntax grammars and related notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

- To all our [Contributors](https://github.com/mshr-h/vscode-verilog-hdl-support/graphs/contributors)
- [Textmate Package for Verilog](https://github.com/textmate/verilog.tmbundle)
- [SublimeLinter-contrib-iverilog](https://github.com/jfcherng/SublimeLinter-contrib-iverilog)
- [SublimeLinter-contrib-vlog](https://github.com/dave2pi/SublimeLinter-contrib-vlog)
- [yangsu/sublime-vhdl](https://github.com/yangsu/sublime-vhdl)
- [Sublime EDA](https://github.com/tschinz/sublime_eda)
- [dalance/svls](https://github.com/dalance/svls)
- [vivekmalneedi/veridian](https://github.com/vivekmalneedi/veridian)
- [suoto/hdl_checker](https://github.com/suoto/hdl_checker)
- [chipsalliance/verible](https://github.com/chipsalliance/verible)
- [ericsonj/verilog-format](https://github.com/ericsonj/verilog-format)
- [thomasrussellmurphy/istyle-verilog-formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter)
- [slang C++ docs](https://sv-lang.com/)
- [Digital-EDA/Digital-IDE: All in one vscode plugin for HDL development](https://github.com/Digital-EDA/Digital-IDE)
  - `configs/tcl.configuration.json` and `syntaxes/tcl.tmlanguage.json` are obtained from the repo.
- [eirikpre/VSCode-SystemVerilog: SystemVerilog support in VS Code](https://github.com/eirikpre/VSCode-SystemVerilog)
  - SystemVerilog syntax is obtained from the repo.
- [raczben/fliplot: HTML & Js based VCD viewer](https://github.com/raczben/fliplot)
- [wavedrom/vcd-samples: sample VCD files](https://github.com/wavedrom/vcd-samples)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=mshr-h/vscode-verilog-hdl-support&type=Date)](https://star-history.com/#mshr-h/vscode-verilog-hdl-support&Date)
