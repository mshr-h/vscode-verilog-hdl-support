# HDL support for VS Code <img src="images/icon.png" alt="HDL support for VS Code icon" width="56" style="vertical-align: middle;" />

HDL support for VS Code with syntax highlighting, snippets, linting, formatting, slang-server powered SystemVerilog intelligence, waveform viewing, and language-server integration.

[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/10949/badge)](https://www.bestpractices.dev/projects/10949)
[Ask DeepWiki](https://deepwiki.com/mshr-h/vscode-verilog-hdl-support)

![sample](images/sample.gif)

## Installation

Install it from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=mshr-h.VerilogHDL) or [Open VSX Registry](https://open-vsx.org/extension/mshr-h/veriloghdl).

## Quick Start

Syntax highlighting, snippets, basic editor integration, and waveform opening work immediately after installation.

Linting is disabled by default. Pick a linter after installing the external tool:

```json
{
    "verilog.linting.linter": "verilator"
}
```

SystemVerilog intelligence is provided by `slang-server`. The default runtime is the bundled WASM server through `verilog.slangServer.runtime = "auto"`, so a native install is not required for the default path. Use `.slang/server.json` for project flags and filelists:

```json
{
    "flags": "-f rtl/files.f",
    "index": [
        {
            "dirs": ["rtl", "tb"],
            "excludeDirs": ["build", "sim", "node_modules"]
        }
    ],
    "build": "rtl/files.f",
    "indexingThreads": 1
}
```

Use **Verilog: Configure Slang Project** to generate or update `.slang/server.json`. Set `verilog.slangServer.runtime` to `native` and `verilog.slangServer.path` to a native `slang-server` executable only when you want the native performance escape hatch.

Use **Verilog: Doctor** from the command palette to inspect the selected slang-server runtime, bundled WASM metadata, external tool paths, formatter setup, linter configuration, and troubleshooting information.

To try the HDL features together, open the [HDL Feature Showcase](examples/hdl-feature-showcase/README.md). It walks through slang-server backed navigation, HDL Explorer hierarchy, diagnostics, file-based linting, and inactive preprocessor regions with a small SystemVerilog project.

## Features

- Syntax highlighting and language modes for HDL, constraint, script, filelist, and waveform files.
- Inactive Verilog/SystemVerilog preprocessor region highlighting.
- VCD waveform viewer integration with embedded [Fliplot](https://github.com/raczben/fliplot) and optional [Vaporview](https://marketplace.visualstudio.com/items?itemName=lramseyer.vaporview).
- Bundled slang-server backend for Verilog/SystemVerilog diagnostics, hover, definition, completion, references, rename, symbols, inlay hints, hierarchy, includes, macros, and module lookup.
- HDL Explorer backed by slang-server hierarchy and module custom commands.
- Linting support for Icarus Verilog, ModelSim, Verilator, Vivado `xvlog`, Slang, and Verible Verilog Lint.
- Optional file-based external linting for Slang, Verilator, Icarus Verilog, and other supported tools.
- Formatting support from `verilog-format`, `iStyle`, and `verible-verilog-format`.
- HDL editing through slang-server LSP: go-to-definition, Find References, Rename Symbol, hover, workspace symbols, completion, document symbols, inlay hints, module instantiation, and code actions.
- Optional language-server integration for VHDL, Tcl, SDC, XDC, and UPF.

## Supported Languages and File Types

| Language / file type | Extensions / usage | Notes |
| --- | --- | --- |
| Verilog-HDL | `.v`, `.vh`, `.vl` | Syntax highlighting, snippets, formatting, linting, and slang-server LSP features |
| SystemVerilog | `.sv`, `.svh`, `.SV` | Syntax highlighting, snippets, formatting, linting, and slang-server LSP features |
| Verilog-AMS | `.vams`, `.va` | Syntax highlighting and Verilog snippets |
| VHDL | `.vhd`, `.vhdl`, `.vho` | Syntax highlighting and optional language-server support |
| UCF constraints | `.ucf` | Syntax highlighting |
| SDC constraints | `.sdc` | Syntax highlighting and optional `tclsp` support |
| XDC constraints | `.xdc` | Syntax highlighting and optional `tclsp` support |
| Tcl | `.tcl`, `.tm`, `.tk` | Syntax highlighting and optional `tclsp` support |
| UPF | `.upf` | Tcl-based syntax highlighting and optional `tclsp` support |
| Verilog filelists | `.f` | Filelist language mode used by `.slang/server.json` |
| VCD waveform dumps | `.vcd` | Open with **Verilog: Open Waveform** |
| Markdown fenced code blocks | `verilog` / `systemverilog` | Embedded highlighting in Markdown |

## Usage Instructions

### Commands

- **Verilog: Rerun lint tool**

    Choose a lint tool from the list and run it manually. Useful if the code was changed by an external script or version control system.

- **Verilog: Doctor**

    Diagnose the configured external tools and write a report to the `Verilog Doctor` output channel. It checks slang-server runtime selection, bundled WASM metadata, config files, the selected linter, formatters, WSL setup, and enabled non-HDL language servers without running linting or formatting on user files.

- **Verilog: Configure Slang Project**

    Search for `.f` files, choose index and exclude directories, generate or update `.slang/server.json`, and restart slang-server.

- **Verilog: Restart Slang Server**

    Restart the active bundled WASM or native slang-server runtime.

- **Verilog: Instantiate Module**

    Choose a module reported by slang-server and insert a minimal instance. Use slang-server completion/code actions to expand ports and parameters.

- **Verilog: Select Slang Build File**

    Select a `.f` build file and send it to slang-server.

- **Verilog: Show Slang Server Status**

    Run Doctor and show slang-server status.

- **Verilog: Show Slang Modules**

    Refresh the slang-server backed module view.

- **Verilog: Refresh HDL Explorer**

    Refresh the HDL Explorer tree view.

- **Verilog: Refresh Hierarchy**

    Refresh the slang-server backed hierarchy used by HDL Explorer.

- **Verilog: Open Waveform**

    Open a VCD waveform file with the configured waveform viewer. By default, this command uses Vaporview when the `lramseyer.vaporview` extension is installed and falls back to the embedded Fliplot viewer otherwise. Configure waveform viewer behavior under `verilog.waveform`.

- **Verilog: Open Fliplot Waveform Viewer**

    Open the embedded Fliplot waveform viewer and load a VCD file.

### Linting

All linters expect the executable binary (`iverilog`, `verilator`, and so on) to be present in the `PATH` environment variable, unless otherwise specified.

```json
{
    "verilog.linting.linter": "verilator"
}
```

On Windows, Vivado `xvlog` can be discovered when it is provided as `xvlog.bat` or `xvlog.cmd` on `PATH` or under `verilog.linting.path`.

Set `verilog.linting.linter` to `none` to disable automatic linting without warnings. Automatic linting runs for Verilog/SystemVerilog files when they are opened or saved and a linter other than `none` is configured. Use `verilog.linting.runOnOpen` and `verilog.linting.runOnSave` to control these triggers independently.

When `xvlog` is used as the linter, Vivado may create simulator/compiler artifacts such as `xsim.dir` and `xvlog.pb`. The extension directs xvlog's temporary work library outside the workspace, so grammar checking can remain enabled without writing the work library into the workspace. If `verilog.linting.xvlog.arguments` includes `-work` or `--work`, the extension leaves that user-managed work library unchanged instead of adding its own temporary work library. `verilog.linting.runOnOpen` and `verilog.linting.runOnSave` can still be used to control automatic lint triggers independently.

While using `` `include`` directives, the path to the files should be relative to the workspace directory, unless `runAtFileLocation` is enabled (not supported by all linters).

### Slang Server Project Setup

Verilog/SystemVerilog semantic features come from `slang-server`. The extension selects the bundled WASM runtime by default through `"verilog.slangServer.runtime": "auto"` unless `verilog.slangServer.path` is set. To use a native executable, set:

```json
{
    "verilog.slangServer.runtime": "native",
    "verilog.slangServer.path": "/path/to/slang-server"
}
```

Configure projects with `.slang/server.json`. Use **Verilog: Configure Slang Project** to generate a starter config from workspace `.f` files, or write one directly:

```json
{
    "flags": "-f rtl/files.f",
    "index": [
        {
            "dirs": ["rtl", "tb"],
            "excludeDirs": ["build", "sim", "node_modules"]
        }
    ],
    "build": "rtl/files.f",
    "indexingThreads": 1
}
```

The bundled WASM runtime is initially single-threaded and does not support arbitrary external command-backed builds. If your `.slang/server.json` uses `builds[].command`, use the native runtime.
The bundled runtime also disables WCP waveform-control sockets and external waveform viewer process launching; use the native runtime if you need those slang-server features.

### HDL Explorer and Hierarchy

The **HDL Explorer** view appears in VS Code's Explorer sidebar when `verilog.hdlExplorer.enabled` is enabled. It is backed by slang-server custom commands for modules, instances, scopes, and hierarchy. Explorer context menus provide refresh, open, filter, copy, build selection, and module-instantiation actions.

### Slang-Backed Editing

For Verilog/SystemVerilog files, slang-server provides diagnostics, go-to-definition, Find References, Rename Symbol, hover, workspace and document symbols, completions, inlay hints, code actions, include and macro understanding, and module lookup. The TypeScript extension no longer maintains a separate semantic index.

Module instantiation uses module names reported by slang-server and inserts a minimal instance. Port/parameter expansion should come from slang-server completion or code actions.
The missing server-side module-signature request is tracked in [docs/slang-server-module-signature.md](docs/slang-server-module-signature.md).

### External Linting

External linting remains available as an explicit tool integration for the active file. Project-wide diagnostics are provided by slang-server; use `.slang/server.json` for include paths, defines, filelists, and build selection that should affect editor diagnostics.

### Inactive Preprocessor Regions

Inactive Verilog/SystemVerilog preprocessor branches controlled by `` `ifdef``, `` `ifndef``, `` `elsif``, `` `else``, and `` `endif`` are highlighted in the editor. The lightweight scanner uses macros defined in the current document plus any workspace-wide macros configured in `verilog.preprocessor.defines`.

```json
{
    "verilog.preprocessor.defines": ["SIMULATION", "USE_VENDOR_IP"],
    "verilog.preprocessor.inactiveCode.enabled": true,
    "verilog.preprocessor.inactiveCode.opacity": 0.45,
    "verilog.preprocessor.inactiveCode.foregroundColor": "",
    "verilog.preprocessor.inactiveCode.backgroundColor": "rgba(255, 0, 0, 0.12)"
}
```

Leave `foregroundColor` or `backgroundColor` empty to use the theme/default styling. This feature is a lightweight editor aid and does not perform full preprocessing.

### Additional Language Servers

Slang-server is always the Verilog/SystemVerilog semantic backend. The optional language-server settings are for non-Verilog languages:

| Language Server                                                | Document languages |
| -------------------------------------------------------------- | ------------------ |
| [vhdl_ls](https://github.com/VHDL-LS/rust_hdl)                 | VHDL |
| [tclsp](https://github.com/nmoroze/tclint)                     | Tcl, SDC, XDC, UPF |

Enable only the language servers you need. For example:

```json
{
    "verilog.languageServer.tclsp.enabled": true
}
```

Install [vhdl_ls](https://github.com/VHDL-LS/rust_hdl) via `cargo`:

```sh
cargo install vhdl_ls
```

Tcl support is provided by [tclsp](https://github.com/nmoroze/tclint) for Tcl/SDC/XDC/UPF files. Configure it under `verilog.languageServer.tclsp` and install `tclint` (provides the `tclsp` binary). Recommended install via `uv`:

```sh
uv tool install tclint
```

### Formatting

We currently support document formatting for Verilog-HDL and SystemVerilog files with the following formatters.

| Formatter | Verilog-HDL | SystemVerilog |
| --- | --- | --- |
| [verilog-format](https://github.com/ericsonj/verilog-format) | Yes | No |
| [thomasrussellmurphy/istyle-verilog-formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter) | Yes | No |
| [verible-verilog-format](https://github.com/chipsalliance/verible) | Yes | Yes |

You can format the current file by typing `Ctrl-Shift-p`, then selecting `Format Document`. Entire file formatting is supported. Selected range formatting is not supported yet. All formatting settings are under the `verilog.formatting` namespace.

The `verilog.formatting.verilogFormat.settings` path supports `${env:VAR}` and `~` expansion, so values such as `${env:HOME}/.verilog-format.properties` and `~/.verilog-format.properties` can be used.

### Limitations

- The bundled WASM runtime is initially single-threaded.
- The bundled WASM runtime does not support arbitrary command-backed builds; use native slang-server for those projects.
- The bundled WASM runtime disables WCP socket/process integration. Waveform UI in this extension remains available through the extension's own waveform commands.
- Unexpected C++ exception paths in the bundled WASI artifact terminate the WASM server process. The extension reports the crash and suggests restart/native runtime through Doctor.
- VS Code Web and virtual workspaces are not supported by the slang-server backend yet.
- External linting is file-based; project-wide editor diagnostics come from slang-server.
- Formatting supports whole-document formatting. Range formatting is not supported.

## [Guidelines for Contributing](./CONTRIBUTING.md)

## Extension Development

### Launch in Debug Mode

1. Install dependencies with `npm install`.
2. Open the repository in VS Code and start the default build task (`watch`) or simply press `F5`—the `Launch Extension` configuration in [.vscode/launch.json](.vscode/launch.json) will run the build task automatically.
3. In the Run and Debug view, pick **Launch Extension** and start debugging. VS Code will open an Extension Development Host pointing at the bundled `language_examples` workspace so you can try the features immediately.
4. Set breakpoints in the `src` files; the compiled output in `out` is mapped via sourcemaps so the breakpoints hit your TypeScript sources.

### Bundled Slang-Server Artifact

The extension package expects the bundled server files under `resources/slang-server/`.
Run `npm run validate:slang-server` to validate metadata, lock-file consistency, schema, notices, and whether `slang-server.wasm` is a WebAssembly binary.
Run `npm run validate:slang-server:strict` for release hardening; it fails unless `resources/slang-server/slang-server.wasm` is a valid wasm32-wasi binary.
Run `npm run validate:vsix-resources` after the production build to verify that the bundled WASM host, server artifact, metadata, schema, and license files are present and not excluded by `.vscodeignore`.

To rebuild the bundled artifact from the pinned lock file, install WASI SDK 27.0 and run:

```sh
WASI_SDK_ROOT=/path/to/wasi-sdk-27.0 npm run build:slang-server-wasm
```

The build script clones or reuses the pinned `slang-server` checkout, applies `build/slang-server-patches/wasm32-wasi-single-thread.patch`, builds a single-threaded `wasm32-wasi` server, strips it with the SDK's `llvm-strip` when available, and writes `resources/slang-server/slang-server.wasm`.

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
