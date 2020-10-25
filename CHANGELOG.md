# Verilog-HDL/SystemVerilog Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [1.3.5] - 2020-10-24

### Fixed

- Fix path issue for Xvlog Linter [#119](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/119)

## [1.3.4] - 2020-10-17

### Fixed

- Include null check for Verilator regex [#114](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/114)

## [1.3.3] - 2020-09-06

### Fixed

- Fix linter issues with newer versions of Verilator. [#113](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/113)

## [1.3.2] - 2020-08-05

### Added

- Added syntax suppport for Synopsys Design Constraints.

## [1.3.1] - 2020-08-01

### Added

- Added syntax suppport for Bluespec SystemVerilog.

## [1.3.0] - 2020-07-01

### Added

- Added experimental suppport for [svls](https://github.com/dalance/svls) Language Server.

## [1.2.2] - 2020-06-29

### Added

- Added support running Verilator under WSL [#109](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/109)

### Changed

- Refactored snippets for Verilog/SystemVerilog

## [1.2.1] - 2020-06-27

### Added

- Tested OSX + iverilog linter

### Fixed

- Fix onDidChangeActiveTextEditor/onSave callback `this` is undefined error [#106](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/106)

## [1.2.0] - 2020-06-22

### Added

- Added syntax highlighting for Vivado UCF constraints

## [1.1.0] - 2020-05-13

### Added

- Update language configuration for better bracket-matching and auto-closing [#100](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/100)
- Enable verilog/systemverilog syntax highlighting in markdown code block [#101](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/101)

## [1.0.6] - 2020-04-21

### Added

- Fixed `ifndef` in Verilog syntax highlighting [#64](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/64)

## [1.0.5] - 2020-03-25

### Added

- Added support for verilator on windows

## [1.0.4] - 2019-11-09

### Added

- Added logging to Output pane
- Added option to invoke linter from specific directory [#80](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/80)

## [1.0.3] - 2019-04-08

### Changed

- Fixed `ifndef` , `casex` and `casez` in Verilog syntax highlighting
- Moved to a new SystemVerilog syntax highlighting

## [1.0.2] - 2019-04-03

### Changed

- Replace fixed space with tab on snippets files
- Properly fixed the bug which caused linter to run on all files

## [1.0.1] - 2019-01-01

### Fixed

- Fixed a bug which caused linter to run on all files

## [1.0.0] - 2018-12-18

### Added

- First Major Release
- Added support for **SystemVerilog**
- Added **Ctags Integration** and the follwing features:
  - Autocomplete
  - Document Symbols Outline
  - Hover over variable declaration
  - Go to Definition & Peek Definition
- Added a command to **Instantiate Module** (also uses Ctags)
- Added a configuration setting `verilog.ctags.path` to specify ctags installation path

### Fixed

- Updated all linters to support SystemVerilog
- Updated README with all the new features and with a gif image showcasing the features of the extension

## [0.3.6] - 2018-10-28

### Added

- Added a command **Rerun lint tool** to manually run the lint tool [#29](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/29)

### Fixed

- Update notification opens the CHANGELOG only when the "Open Changelog" button is clicked

## [0.3.5] - 2018-10-13

### Added

- Added contributing guidelines [#36](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/36)

### Changed

- Reorganized README [#36](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/36)

### Fixed

- Fixed dependencies in package.json [#35](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/35)

## [0.3.4] - 2018-09-23

### Added

- Added support for **Verilator** linter

## [0.3.3] - 2018-07-01

### Added

- Added support for **Modelsim** linter

## [0.3.2] - 2018-05-15

### Added

- Show notification to view CHANGELOG when the extension gets updated [#14](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/14)

## [0.3.1] - 2018-05-12

### Fixed

- Fixed [#16](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/16)

## [0.3.0] - 2018-05-01

### Added

- Added CHANGELOG
- Added `verilog.linting.iverilog.runAtFileLocation` setting to run Icarus Verilog at file location

### Changed

- Changed `verilog.linting.linter` to enum.
- Updated README with documentation for `verilog.linting.iverilog.runAtFileLocation`

### Fixed

- Fixed [#13](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/13)

## [0.2.1] - 2017-04-14

### Fixed

- Fixed iVerilog linter arguments not loaded at startup
