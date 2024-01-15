# Verilog-HDL/SystemVerilog Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [1.13.1] - 2024-01-15

### Fixed

- Fix [#102](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/102)
  - requires [Universal Ctags, Oct 22, 2020 version](https://github.com/universal-ctags/ctags/pull/2666) and later.

## [1.13.0] 2023-08-31

### Added

- Add support for [rust_hdl](https://github.com/VHDL-LS/rust_hdl) Language Server. [#360](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/360)

## [1.12.0] - 2023-08-14

- Update README.md for ctags [#433](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/433)
- Added syntax highlighting for Tcl [#440](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/440)
- Updated dependencies [#431](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/431), [#435](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/435), [#437](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/437), [#438](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/438), [#439](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/439)

## [1.11.11] - 2023-06-13

### Fixed

- Fix [#428](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/428)

## [1.11.10] - 2023-06-12

### Fixed

- Fix slang warning message with square brackets [#427](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/427)

## [1.11.9] - 2023-06-09

## Changed

- Improved logging implementation [#412](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/412)
- Update dependencies (glob to v10, typescript to v5.0.4, and more) [#414](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/414), [#424](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/424), [#425](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/425)

### Fixed

- Refactor linters

## [1.11.8] - 2023-06-09

### Fixed

- Fix Verilator linting include paths [#422](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/422)

## [1.11.7] - 2023-06-08

### Fixed

- Add quotation marks around paths for Slang, Verilator and Xvlog [#420](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/420)

## [1.11.6] - 2023-06-06

### Fixed

- Fixed [#418](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/418) again.

## [1.11.5] - 2023-06-02

### Fixed

- Fixed Slang & Verilator: cant run under WSL [#418](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/418)
- Fixed [#139](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/139)

## [1.11.4] - 2023-04-19

### Fixed

- Fixed only push diagnostics from Slang in the current file [#415](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/415)

## [1.11.3] - 2023-03-27

### Fixed

- Fixed [#407](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/407). [#411](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/411)

## [1.11.2] - 2023-03-24

### Fixed

- Added more logging messages to be able to debug [#407](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/407). [#410](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/410)

## [1.11.1] - 2023-03-04

### Added

- Re-added experimental support for verible-verilog-ls Language Server. [#404](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/404)

## [1.11.0] - 2023-02-02

### Added

- Added an experimental support for Slang linting. [#387](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/387)

## [1.10.0] - 2023-01-06

### Added

- Added an experimental option for xvlog linting. [#382](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/382)
  - `verilog.linting.xvlog.includePath` is to specify include directories.
  - \[Caution\] I've only tested on Ubuntu on WSL2 platform. If you find any problems about xvlog linting, please let me know.
- Internal cleanup [#383](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/383)

## [1.9.0] - 2022-12-29

### Added

- Added experimental options for Icarus Verilog linting. [#379](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/379)
  - `verilog.linting.iverilog.includePath` is to specify include directories.
  - `verilog.linting.iverilog.verilogHDL.standard` is to specify standard rules for Verilog-HDL files.
  - `verilog.linting.iverilog.systemVerilog.standard` is to specify standard rules for SystemVerilog files.
  - \[Caution\] I've only tested on Ubuntu on WSL2 platform. If you find any problems about Icarus Verilog linting, please let me know.
- Added an experimental option for Verilator linting. [#380](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/380)
  - `verilog.linting.verilator.includePath` is to specify include directories.
  - \[Caution\] I've only tested on Ubuntu on WSL2 platform. If you find any problems about Verilator linting, please let me know.

## [1.8.1] - 2022-12-26

### Fixed

- Fixed `Instantiate Module` not working issue. [#376](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/376)

## [1.8.0] - 2022-12-22

### Added

- Added experimental formatting support with verible-verilog-format for the following languages. [#371](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/371)
  - Verilog-HDL
  - SystemVerilog

### Changed

- \[Caution\] Updated config namespace for formatter. [#371](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/371)
  - `verilog.formatter` -> `verilog.formatting`
- Improved logging implementation. [#374](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/374)
  - Replaced own `Logger` class with `vscode.LogOutputChannel`.
  - \[Caution\] From this version, the extension requires VS Code at least 1.74.0 or above.

## [1.7.0] - 2022-12-21

### Added

- Added experimental support for Verilog-HDL formatting with the following formatters.
  - [verilog-format](https://github.com/ericsonj/verilog-format) [#364](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/364)
  - [thomasrussellmurphy/istyle-verilog-formatter: Open source implementation of a Verilog formatter](https://github.com/thomasrussellmurphy/istyle-verilog-formatter) [#365](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/365).

## [1.6.0] - 2022-12-20

### Added

- Added experimental support for multiple Language Server [#353](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/353).
  - \[Caution\] Language Server config names has changed!
  - Users may have to reset all the configs related to Language Server feature.

### Removed

- verible-verilog-ls support is temporary dropped because it returns error when stopping.

### Changed

- Changes for language server config take effect immediately.
- Intenal refactoring [#363](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/363)

### Removed

- Deprecated `verilog.logging.enabled` option.
  - Logs are always outputted to the **Verilog** OutputChannel of VS Code in the **Output** pane.

## [1.5.13] - 2022-12-12

### Added

- Adds basic syntax highlighting for Verilog Filelists (dot-F files).
- Add support for [verible-verilog-ls](https://github.com/chipsalliance/verible/tree/master/verilog/tools/ls) Language Server.

## [1.5.12] - 2022-12-04

### Fixed

- Fix hdl_checker support.
- Some internal update.

## [1.5.11] - 2022-11-19

### Added

- Add VHDL support with syntax highlighting.
- Enable hdl_checker for VHDL files.
- Use esbuild for extension publishing which reduces extension size from 10MB to 0.5MB (95% smaller)!

## [1.5.10] - 2022-11-17

### Added

- Add support for [vivekmalneedi/veridian](https://github.com/vivekmalneedi/veridian) Language Server.
- Add support for [suoto/hdl_checker](https://github.com/suoto/hdl_checker) Language Server.
- Enable BSV tests on GitHub Actions

## [1.5.9] - 2022-11-12

### Fixed

- Revert [#331](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/331) because instantiate module function was broken.

## [1.5.8] - 2022-11-12

### Fixed

- Fix [#332](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/332)

## [1.5.7] - 2022-11-11

### Added

- Add toggle option for Language Server in config.
- Add binary path option for Language Server in config.
- Add selector option for Language Server in config.

## [1.5.6] - 2022-11-11

### Fixed

- Fix [#326](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/326)

## [1.5.5] - 2022-11-10

### Changed

- Do not load extension until supported file opened.
- Address `workspace.rootPath` deprecation

## [1.5.4] - 2022-06-11

### Added

- Added the ability to disable Ctag [#281](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/281)
- Added the ability to specify PATH for linter [#282](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/282)

### Changed

- Update dependent packages

## [1.5.3] - 2021-12-17

- Support `undef` keyword [#127](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/127)
- Update dependent packages

## [1.5.2] - 2021-11-11

### Changed

- Downgrade supported minimum vscode version to 1.60.0

## [1.5.1] - 2021-11-08

### Changed

- Update dependent packages

## [1.5.0] - 2021-07-03

### Added

- Add Bluespec Verilog Syntax Support [#162](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/162)

## [1.4.5] - 2021-05-15

### Fixed

- Fix function call syntax highlight inside module declaration

## [1.4.4] - 2021-05-15

### Fixed

- Fix ctags symbols not being updated in some cases [#150](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/150)
- Share DiagnosticCollection between linters [#150](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/150)

## [1.4.3] - 2021-04-28

- Fix linters and some errors [#146](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/146)

## [1.4.2] - 2021-01-23

### Added

- Update SDC syntax and add support XDC files [#134](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/134)

### Changed

- Update syntax for markdown codeblocks [#135](https://github.com/mshr-h/vscode-verilog-hdl-support/pull/135)

## [1.4.1] - 2021-01-18

### Fixed

- Add Ctags execution when opening document [#132](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/132)

## [1.4.0] - 2021-01-18

### Added

- Add always_latch snippet [#99](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/99)
- Add new snippets, including casex/casez, compiler directives, procedural blocks, and packages

### Changed

- Change prefix for module without parameters [#94](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/94)
- Updated existing snippet prefixes, including always blocks, modules, scalar & vector data types, directives, and the testbench template
- Updated snippet names for clarity
- Moved applicable snippets (ex. `timescale`, `parameter`) to also support Verilog

### Removed

- Removed redundant snippets

## [1.3.6] - 2020-11-21

### Added

- Add arguments support for xvlog linter [#122](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/122)

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
