# Verilog HDL support for VS Code
Verilog HDL and SystemVerilog support for VS Code with Syntax Highlighting, Snippets, Linting and much more!

[![Build Status](https://travis-ci.org/mshr-h/vscode-verilog-hdl-support.svg?branch=master)](https://travis-ci.org/mshr-h/vscode-verilog-hdl-support)

![sample](images/sample.gif)

## Installation

Install it from [VS Code Marketplace](https://marketplace.visualstudio.com/items/mshr-h.VerilogHDL)

## Features

### Done

- Verilog and SystemVerilog Support
- Syntax Highlighting
- Simple Snippets
- Linting support from:
    * Icarus Verilog - `iverilog`
    * Vivado Logical Simulation - `xvlog`
    * Modelsim - `modelsim`
    * Verilator - `verilator`
- Ctags Integration
    * Autocomplete
    * Document Symbols Outline
    * Hover over variable declaration
    * Go to Definition & Peek Definition
    * Module Instantiation

### In Progress / Future

- Improvements in the newly added features

[Take a look at our list of planned features](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/25)

### Ctags Integration

This extension uses the tags created using Ctags to provide many of its features. It is recommended to use [Universal Ctags](https://github.com/universal-ctags/ctags) as it supports SystemVerilog also, compared to Exuberant Ctags and other older versions. The tags are stored in memory and not as separate files.

### Installation of Universal Ctags

* Windows - Daily builds are available at [ctags-win32](https://github.com/universal-ctags/ctags-win32)
* Linux - Installation instructions are [here](https://github.com/universal-ctags/ctags/blob/master/docs/autotools.rst)
* macOS - Install through Homebrew from [here](https://github.com/universal-ctags/homebrew-universal-ctags)

Add the installation path of Ctags binary in your `PATH` environment variable or mention it in `verilog.ctags.path` setting.

## Configuration Settings

Use the following settings to configure the extension to your needs

* `verilog.linting.linter` (Default: `none`)

    Choose the linter for you. Possible values are
    - `iverilog`
    - `xvlog`
    - `modelsim`
    - `verilator`
    - `none`

* `verilog.linting.iverilog.arguments` (Default: nothing)

    Add custom arguments to Icarus Verilog for linting, like `-Wall`. The argument `-t null` will be added by the linter automatically.

* `verilog.linting.iverilog.runAtFileLocation` (Default: False)

    By default, the linter will be run at the workspace directory. Enable this option to run at the file location. If enabled, `` `include`` directives should contain file paths relative to the current file.

* `verilog.linting.modelsim.arguments` (Default: nothing)

    Add custom arguments to Modelsim for linting.

* `verilog.linting.verilator.arguments` (Default: nothing)

    Add custom arguments to Verilator for linting, like `-Wall`. The argument `--lint-only -I<document folder>` will be added by the linter automatically.

* `verilog.linting.verilator.runAtFileLocation` (Default: False)

    By default, the linter will be run at the workspace directory. Enable this option to run at the file location. If enabled, `` `include`` directives should contain file paths relative to the current file.

* `verilog.ctags.path` (Default: ctags)

    Path to your installation of Ctags if it isn't already present in your `PATH` environment variable.

## Commands

* **Rerun lint tool**

    Choose a lint tool from the list and run it manually. Useful if the code was changed by an external script or version control system.

* **Instantiate Module**

    Choose a module present in your workspace to instantiate it in the current file.

## Usage Instructions

* All linters expect the executable binary (`iverilog`, `verilator`...) to be present in the `PATH` environment variable, unless otherwise specified.
* While using `` `include`` directives, the path to the files should be relative to the workspace directory, unless `runAtFileLocation` is enabled (not supported by all linters)

## Compatability

Feature | Windows | Linux | MacOS
--- |:---:|:---:|:---:
Basics (like Syntax highlighting) | Yes | Yes | Should work
Icarus Verilog | Windows 10 | Ubuntu 18.04 | Not Tested
Vivado Logical Simulation | Yes | Not Tested | Not Tested
Modelsim | Windows 10 | Not Tested | Not Tested
Verilator | Not available | Debian 9 | Not Tested
Ctags Integration | Windows 10 | Ubuntu 18.10 | Not Tested

If you have tested the linters in new platforms or have issues with them, feel free to file an issue.

## [Guidelines for Contributing](./CONTRIBUTING.md)

## Thanks
* To all our [Contributors](https://github.com/mshr-h/vscode-verilog-hdl-support/graphs/contributors)
* [Textmate Package for Verilog](https://github.com/textmate/verilog.tmbundle)
* [SublimeLinter-contrib-iverilog](https://github.com/jfcherng/SublimeLinter-contrib-iverilog)
* [SublimeLinter-contrib-vlog](https://github.com/dave2pi/SublimeLinter-contrib-vlog)
