# Verilog HDL Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## Unreleased
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
