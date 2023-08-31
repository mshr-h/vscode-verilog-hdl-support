# HDL support for VS Code

HDL support for VS Code with Syntax Highlighting, Snippets, Linting, Formatting and much more!

[![Install Count](https://img.shields.io/visual-studio-marketplace/i/mshr-h.VerilogHDL.svg)](https://marketplace.visualstudio.com/items?itemName=mshr-h.VerilogHDL)
[![Download Count](https://img.shields.io/visual-studio-marketplace/d/mshr-h.VerilogHDL.png)](https://marketplace.visualstudio.com/items?itemName=mshr-h.VerilogHDL)

![sample](images/sample.gif)

## Installation

Install it from [VS Code Marketplace](https://marketplace.visualstudio.com/items/mshr-h.VerilogHDL) or [Open VSX Registry](https://open-vsx.org/extension/mshr-h/veriloghdl).

## Features

- Syntax Highlighting
  - Verilog-HDL
  - SystemVerilog
  - Bluespec SystemVerilog
  - VHDL
  - Vivado UCF constraints
  - Synopsys Design Constraints
  - Verilog Filelists (dot-F files)
  - Tcl
- Simple Snippets
- Linting support from:
  - Icarus Verilog - `iverilog`
  - Modelsim - `modelsim`
  - Verilator - `verilator`
  - Vivado Logical Simulation - `xvlog`
  - \[Experimental\] Slang - `slang`
- Linting support
  - Bluespec SystemVerilog
- Ctags Integration
  - Autocomplete
  - Document Symbols Outline
  - Hover over variable declaration
  - Go to Definition & Peek Definition
  - Module Instantiation
- \[Experimental\] Language Server support from:
  - [svls](https://github.com/dalance/svls)
  - [veridian](https://github.com/vivekmalneedi/veridian)
  - [HDL Checker](https://github.com/suoto/hdl_checker)
  - [verible-verilog-ls](https://github.com/chipsalliance/verible)
  - [rust_hdl](https://github.com/VHDL-LS/rust_hdl)
- \[Experimental\] Formatting support from:
  - [verilog-format](https://github.com/ericsonj/verilog-format)
  - [istyle-verilog-formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter)
  - [verible-verilog-format](https://github.com/chipsalliance/verible)

## Usage Instructions

- All linters expect the executable binary ( `iverilog` , `verilator` ...) to be present in the `PATH` environment variable, unless otherwise specified.
- While using `` `include`` directives, the path to the files should be relative to the workspace directory, unless`runAtFileLocation` is enabled (not supported by all linters)

### Ctags Integration

This extension uses the tags created using Ctags to provide many of its features. It is recommended to use [Universal Ctags](https://github.com/universal-ctags/ctags) as it supports SystemVerilog also, compared to Exuberant Ctags and other older versions. The tags are stored in memory and not as separate files.

Currently the integrated feature supports only tags in the currently opened file, not tags in other files.
However, you can use other independent Ctags extensions to find definitions from any file.

For example [Ctags Companion](https://github.com/gediminasz/ctags-companion) works well with this extension
by adding the following settings on `.vscode/settings.json` in your workspace.

```json
{
    "ctags-companion.command": "ctags -R --fields=+nKz -f .vscode/.tags --langmap=SystemVerilog:+.v -R rtl /opt/uvm-1.2/src",
    "ctags-companion.readtagsEnabled": true,
}
```

It searches for definitions not only in the workspace, but also in files outside the workspace (ex. `/opt/uvm-1.2/src` in the example above).
It also supports the `readtags` command included in Universal Ctags, allowing for fast searches from large workspaces.

#### Installation of Universal Ctags

- Windows - Daily builds are available at [ctags-win32](https://github.com/universal-ctags/ctags-win32)
- Linux - Installation instructions are [here](https://github.com/universal-ctags/ctags/blob/master/docs/autotools.rst)
- macOS - Install through Homebrew from [here](https://github.com/universal-ctags/homebrew-universal-ctags)

Add the installation path of Ctags binary in your `PATH` environment variable or mention it in `verilog.ctags.path` setting.

### Commands

- **Rerun lint tool**

    Choose a lint tool from the list and run it manually. Useful if the code was changed by an external script or version control system.

- **Instantiate Module**

    Choose a module present in your workspace to instantiate it in the current file.

### Language Servers (Experimental)

We currently support the following Language Servers and enabled for Verilog-HDL, SystemVerilog and VHDL.
You can enable multiple Language Servers at the same time.
It might be pretty unstable because it's currently in the experimental support.
If you encounter any problems even if it's not related to this feature, **deleting all the config may solve the problem**.

| Language Server                                                | Verilog-HDL   | SystemVerilog | VHDL          |
| -------------------------------------------------------------- | :-----------: | :-----------: | :-----------: |
| [svls](https://github.com/dalance/svls)                        | not supported | enabled       | not supported |
| [veridian](https://github.com/vivekmalneedi/veridian)          | not supported | enabled       | not supported |
| [HDL Checker](https://github.com/suoto/hdl_checker)            | enabled       | enabled       | enabled       |
| [verible-verilog-ls](https://github.com/chipsalliance/verible) | not supported | enabled       | not supported |
| [rust_hdl](https://github.com/VHDL-LS/rust_hdl)                | not supported | not supported | enabled       |

### Formatting (Experimental)

We currently support Verilog-HDL file formatting with the following formatters.

- [verilog-format](https://github.com/ericsonj/verilog-format)
- [thomasrussellmurphy/istyle-verilog-formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter).
- [verible-verilog-format](https://github.com/chipsalliance/verible)

You can format the Verilog-HDL file by typing `Ctrl-Shift-p`, then select `Format Document`.
Entire file formatting is supported. Selected range formatting is not supported yet.
All the settings for formatting is under `verilog.formatting` namespace.

## Configuration Settings

Use the following settings to configure the extension to your needs.

- `verilog.linting.linter` (Default: `none` )

    Choose the linter for you. Possible values are

  - `iverilog`
  - `modelsim`
  - `slang`
  - `verilator`
  - `xvlog`
  - `none`

- `verilog.linting.iverilog.arguments` (Default: nothing)

    Add custom arguments to Icarus Verilog for linting, like `-Wall` . The argument `-t null` will be added by the linter automatically.

- `verilog.linting.iverilog.includePath` (Default: nothing)

    A list of directory paths to use while Icarus Verilog linting.
    All the paths are passed as arguments `-I <directory_path>`.
    Paths can be specified either an absolute or a relate to the workspace directory.

- `verilog.linting.iverilog.runAtFileLocation` (Default: `false` )

    By default, the linter will be run at the workspace directory. Enable this option to run at the file location. If enabled, `` ` include`` directives should contain file paths relative to the current file.

- `verilog.linting.modelsim.arguments` (Default: nothing)

    Add custom arguments to Modelsim for linting.

- `verilog.linting.modelsim.work` (Default: nothing)

    Add custom work library to Modelsim for linting.

- `verilog.linting.slang.arguments` (Default: nothing)

    Add Slang arguments here (like macros). They will be added to Slang while linting (The command \"-I=<document folder>\" will be added by the linter by default).

- `verilog.linting.slang.includePath` (Default: nothing)

    A list of directory paths to use while Slang linting.

- `verilog.linting.slang.runAtFileLocation` (Default: `false` )

    If enabled, Slang will be run at the file location for linting. Else it will be run at workspace folder. Disabled by default.

- `verilog.linting.slang.useWSL` (Default: `false` )

    Run verilator under WSL. Paths generated automatically by the extension (the path to the Verilog file as well as
    the auto-generated document folder for `-I` ) are translated to WSL paths using the `wslpath` program.
    Any other paths you specify in `verilog.linting.includePath.arguments`

- `verilog.linting.verilator.arguments` (Default: nothing)

    Add custom arguments to Verilator for linting, like `-Wall` . The argument `--lint-only -I<document folder>` will be added by the linter automatically.

- `verilog.linting.verilator.includePath` (Default: nothing)

    A list of directory paths to use while Verilator linting.
    All the paths are passed as arguments `-I<directory_path>`.
    Paths can be specified either an absolute or a relate to the workspace directory.

- `verilog.linting.verilator.runAtFileLocation` (Default: `false` )

    By default, the linter will be run at the workspace directory. Enable this option to run at the file location. If enabled, `` ` include`` directives should contain file paths relative to the current file.

- `verilog.linting.verilator.useWSL` (Default: `false` )

    Run verilator under WSL (use `apg-get install verilator` to install). Paths generated automatically by the
    extension (the path to the Verilog file as well as the auto-generated document folder for `-I` ) are translated
    to WSL paths using the `wslpath` program. Any other paths you specify in `verilog.linting.verilator.arguments`

    must be manually converted.

- `verilog.linting.xvlog.arguments` (Default: nothing)

    Add custom arguments to Xilinx xvlog for linting, like `-Wall` . The argument `--nolog` will be added by the linter automatically.

- `verilog.linting.xvlog.includePath` (Default: nothing)

    A list of directory paths to use while Xilinx xvlog linting.
    All the paths are passed as arguments `-i <directory_path>`.
    Paths can be specified either an absolute or a relate to the workspace directory.

- `verilog.ctags.path` (Default: `ctags` )

    Path to your installation of Ctags if it isn't already present in your `PATH` environment variable.

- `verilog.languageServer.svls.enabled` (Default: `false`)

    \[Experimental\] Enable svls Language Server for SystemVerilog.

- `verilog.languageServer.svls.path` (Default: `svls`)

    \[Experimental\] A path to the svls Language Server binary.

- `verilog.languageServer.veridian.enabled` (Default: `false`)

    \[Experimental\] Enable veridian Language Server for SystemVerilog.

- `verilog.languageServer.veridian.path` (Default: `veridian`)

    \[Experimental\] A path to the veridian Language Server binary.

- `verilog.languageServer.hdlChecker.enabled` (Default: `false`)

    \[Experimental\] Enable HDL Checker Language Server for Verilog-HDL, SystemVerilog, and VHDL.

- `verilog.languageServer.hdlChecker.path` (Default: `hdl_checker`)

    \[Experimental\] A path to the HDL Checker Language Server binary.

- `verilog.languageServer.veribleVerilogLs.enabled` (Default: `false`)

    \[Experimental\] Enable verible-verilog-ls Language Server for SystemVerilog.

- `verilog.languageServer.veribleVerilogLs.path` (Default: `verible-verilog-ls`)

    \[Experimental\] A path to the verible-verilog-ls Language Server binary.

- `verilog.languageServer.rustHdl.enabled` (Default: `false`)

    \[Experimental\] Enable rust_hdl Language Server for VHDL.

- `verilog.languageServer.rustHdl.path` (Default: `vhdl_ls`)

    \[Experimental\] A path to the rust_hdl Language Server binary.

- `verilog.formatting.verilogHDL.formatter` (Default: `verilog-format`)

    \[Experimental\] Choose the Verilog-HDL formatter. Possible values are:

  - `verilog-format`
  - `iStyle`
  - `verible-verilog-format`

- `verilog.formatting.systemVerilog.formatter` (Default: `verible-verilog-format`)

    \[Experimental\] Choose the Verilog-HDL formatter. Possible values are:

  - `verible-verilog-format`

- `verilog.formatting.verilogFormat.path` (Default: `verilog-format`)

    \[Experimental\] A path to the verilog-format binary.

- `verilog.formatting.verilogFormat.settings` (Default: `${env:HOME}/.verilog-format.properties`)

    \[Experimental\] A path to the verilog-format settings file.

- `verilog.formatting.iStyleVerilogFormatter.path` (Default: `iStyle`)

    \[Experimental\] A path to the iStyle Verilog Formatter binary.

- `verilog.formatting.iStyleVerilogFormatter.arguments` (Default: nothing)

    \[Experimental\] Add custom arguments to iStyle Verilog Formatter for formatting.

- `verilog.formatting.iStyleVerilogFormatter.style` (Default: `Indent only`)

    \[Experimental\] Choose styling options from ANSI/K&R/GNU.

- `verilog.formatting.veribleVerilogFormatter.path` (Default: `verible-verilog-format`)

    \[Experimental\] A path to the verible-verilog-format binary.

- `verilog.formatting.veribleVerilogFormatter.arguments` (Default: nothing)

    \[Experimental\] Add custom arguments to verible-verilog-format for formatting.

## Compatibility

| Feature                           |  Windows   |    Linux     |    macOS    |
| --------------------------------- | :--------: | :----------: | :---------: |
| Basics (like Syntax highlighting) | Windows 10 | Ubuntu 20.04 | macOS 10.15 |
| Icarus Verilog                    | Windows 10 | Ubuntu 18.04 |     Yes     |
| Vivado Logical Simulation         | Windows 10 |  Not Tested  | Not Tested  |
| Modelsim                          | Windows 10 | Ubuntu 18.04 | Not Tested  |
| Verilator                         | Windows 10 |   Debian 9   | Not Tested  |
| Ctags Integration                 | Windows 10 | Ubuntu 18.10 | Not Tested  |
| Language Server                   | Windows 10 | Ubuntu 20.04 | macOS 10.15 |
| Formatting                        | Not tested | Ubuntu 20.04 | Not tested  |

If you have tested the linters in new platforms or have issues with them, feel free to file an issue.

## [Guidelines for Contributing](./CONTRIBUTING.md)

## Logs

Logs are outputted to LogOutputChannel in th VS Code.
You can check it by opening the **Output** pane in VS Code and choose _Verilog_ in the drop-down menu.

## Helpful links

- [Verilog in VSCode With Linting (Using Modelsim) - YouTube](https://www.youtube.com/watch?v=-DTGf3Z6v_o)

## Thanks

- To all our [Contributors](https://github.com/mshr-h/vscode-verilog-hdl-support/graphs/contributors)
- [Textmate Package for Verilog](https://github.com/textmate/verilog.tmbundle)
- [SublimeLinter-contrib-iverilog](https://github.com/jfcherng/SublimeLinter-contrib-iverilog)
- [SublimeLinter-contrib-vlog](https://github.com/dave2pi/SublimeLinter-contrib-vlog)
- [Sublime Text Bluespec SystemVerilog](https://github.com/thotypous/sublime-bsv)
- [yangsu/sublime-vhdl](https://github.com/yangsu/sublime-vhdl)
- [Sublime EDA](https://github.com/tschinz/sublime_eda)
- [dalance/svls](https://github.com/dalance/svls)
- [vivekmalneedi/veridian](https://github.com/vivekmalneedi/veridian)
- [suoto/hdl_checkerChecker](https://github.com/suoto/hdl_checker)
- [chipsalliance/verible](https://github.com/chipsalliance/verible)
- [ericsonj/verilog-format](https://github.com/ericsonj/verilog-format)
- [thomasrussellmurphy/istyle-verilog-formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter)
- [slang C++ docs](https://sv-lang.com/)
- [bitwisecook/vscode-tcl: Tcl for Visual Studio Code](https://github.com/bitwisecook/vscode-tcl)
  - `configs/tcl.configuration.json` and `syntaxes/tcl.tmlanguage.json` are obtained from the repo.
