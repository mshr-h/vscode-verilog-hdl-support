# HDL support for VS Code

HDL support for VS Code with Syntax Highlighting, Snippets, Linting and much more!

[![Build Status](https://github.com/mshr-h/vscode-verilog-hdl-support/workflows/.github/workflows/ci.yml/badge.svg?branch=master&event=push)](https://github.com/mshr-h/vscode-verilog-hdl-support/actions?query=workflow%3A.github%2Fworkflows%2Fci.yml)

![sample](images/sample.gif)

## Installation

Install it from [VS Code Marketplace](https://marketplace.visualstudio.com/items/mshr-h.VerilogHDL) or [Open VSX Registry](https://open-vsx.org/extension/mshr-h/veriloghdl)

## Features

### Done

- Syntax Highlighting
  - Verilog-HDL
  - SystemVerilog
  - Bluespec SystemVerilog
  - VHDL
  - Vivado UCF constraints
  - Synopsys Design Constraints
  - Verilog Filelists (dot-F files)
- Simple Snippets
- Linting support from:
  - Icarus Verilog - `iverilog`
  - Vivado Logical Simulation - `xvlog`
  - Modelsim - `modelsim`
  - Verilator - `verilator`
- Linting support
  - Bluespec SystemVerilog
- Ctags Integration
  - Autocomplete
  - Document Symbols Outline
  - Hover over variable declaration
  - Go to Definition & Peek Definition
  - Module Instantiation

### In Progress / Future

- \[Experimental\] Language Server support
  - [svls](https://github.com/dalance/svls)
  - [veridian](https://github.com/vivekmalneedi/veridian)
  - [HDL Checker](https://github.com/suoto/hdl_checker)
- \[Experimental\] Formatter support
  - [verilog-format](https://github.com/ericsonj/verilog-format)
  - [istyle-verilog-formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter)
- Improvements in the newly added features
- Migrate VHDL support from [mshr-h/vscode-vhdl-support](https://github.com/mshr-h/vscode-vhdl-support)

[Take a look at our list of planned features](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/25)

### Ctags Integration

This extension uses the tags created using Ctags to provide many of its features. It is recommended to use [Universal Ctags](https://github.com/universal-ctags/ctags) as it supports SystemVerilog also, compared to Exuberant Ctags and other older versions. The tags are stored in memory and not as separate files.

### Installation of Universal Ctags

- Windows - Daily builds are available at [ctags-win32](https://github.com/universal-ctags/ctags-win32)
- Linux - Installation instructions are [here](https://github.com/universal-ctags/ctags/blob/master/docs/autotools.rst)
- macOS - Install through Homebrew from [here](https://github.com/universal-ctags/homebrew-universal-ctags)

Add the installation path of Ctags binary in your `PATH` environment variable or mention it in `verilog.ctags.path` setting.

## Configuration Settings

Use the following settings to configure the extension to your needs

- `verilog.linting.linter` (Default: `none` )

    Choose the linter for you. Possible values are

  - `iverilog`
  - `xvlog`
  - `modelsim`
  - `verilator`
  - `none`

- `verilog.linting.iverilog.arguments` (Default: nothing)

    Add custom arguments to Icarus Verilog for linting, like `-Wall` . The argument `-t null` will be added by the linter automatically.

- `verilog.linting.iverilog.runAtFileLocation` (Default: `false` )

    By default, the linter will be run at the workspace directory. Enable this option to run at the file location. If enabled, `` ` include`` directives should contain file paths relative to the current file.

- `verilog.linting.modelsim.arguments` (Default: nothing)

    Add custom arguments to Modelsim for linting.

- `verilog.linting.modelsim.work` (Default: nothing)

    Add custom work library to Modelsim for linting.

- `verilog.linting.verilator.arguments` (Default: nothing)

    Add custom arguments to Verilator for linting, like `-Wall` . The argument `--lint-only -I<document folder>` will be added by the linter automatically.

- `verilog.linting.verilator.runAtFileLocation` (Default: `false` )

    By default, the linter will be run at the workspace directory. Enable this option to run at the file location. If enabled, `` ` include`` directives should contain file paths relative to the current file.

- `verilog.linting.verilator.useWSL` (Default: `false` )

    Run verilator under WSL (use `apg-get install verilator` to install). Paths generated automatically by the
    extension (the path to the Verilog file as well as the auto-generated document folder for `-I` ) are translated
    to WSL paths using the `wslpath` program. Any other paths you specify in `verilog.linting.verilator.arguments`

    must be manually converted.

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

- `verilog.formatter.verilogHDL.name` (Default: `verilog-format`)

    \[Experimental\] Choose the Verilog-HDL formatter. Possible values are:

  - `verilog-format`
  - `iStyle`

- `verilog.formatter.verilogFormat.path` (Default: `verilog-format`)

    \[Experimental\] A path to the verilog-format binary.

- `verilog.formatter.verilogFormat.settings` (Default: `${env:HOME}/.verilog-format.properties`)

    \[Experimental\] A path to the verilog-format settings file.

- `verilog.formatter.iStyleVerilogFormatter.path` (Default: `iStyle`)

    \[Experimental\] A path to the iStyle Verilog Formatter binary.

- `verilog.formatter.iStyleVerilogFormatter.arguments` (Default: nothing)

    \[Experimental\] Add custom arguments to iStyle Verilog Formatter for formatting.

- `verilog.formatter.iStyleVerilogFormatter.style` (Default: `Indent only`)

    \[Experimental\] Choose styling options from ANSI/K&R/GNU.

## Commands

- **Rerun lint tool**

    Choose a lint tool from the list and run it manually. Useful if the code was changed by an external script or version control system.

- **Instantiate Module**

    Choose a module present in your workspace to instantiate it in the current file.

## Usage Instructions

- All linters expect the executable binary ( `iverilog` , `verilator` ...) to be present in the `PATH` environment variable, unless otherwise specified.
- While using `` `include`` directives, the path to the files should be relative to the workspace directory, unless`runAtFileLocation` is enabled (not supported by all linters)

## Language Servers

We currently support the following Language Servers and enabled for Verilog-HDL, SystemVerilog and VHDL.
It might be pretty unstable because it's currently in the experimental support.
If you encounter any problems even if it's not related to this feature, **deleting all the config may solve the problem**.

| Language Server                                                | Verilog-HDL   | SystemVerilog | VHDL          |
| -------------------------------------------------------------- | :-----------: | :-----------: | :-----------: |
| [svls](https://github.com/dalance/svls)                        | not supported | enabled       | not supported |
| [veridian](https://github.com/vivekmalneedi/veridian)          | not supported | enabled       | not supported |
| [HDL Checker](https://github.com/suoto/hdl_checker)            | enabled       | enabled       | enabled       |

## Formatter (Experimental)

We currently support Verilog-HDL file formatting with [verilog-format](https://github.com/ericsonj/verilog-format) and [thomasrussellmurphy/istyle-verilog-formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter). You can format Verilog-HDL file by typing `Ctrl-Shift-p`, then select `Format Document`.
Entire file formatting is supported. Selected range formatting is not supported yet.

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
| Formatter                         | Not tested | Ubuntu 20.04 | Not tested  |

If you have tested the linters in new platforms or have issues with them, feel free to file an issue.

## [Guidelines for Contributing](./CONTRIBUTING.md)

## Logging

Logs are outputted to OutputChannel in th VS Code.
Open the **Output** pane in VS Code and choose _Verilog_ in the drop-down menu to view the log.

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
