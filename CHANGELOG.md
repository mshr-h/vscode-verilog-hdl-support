# Verilog HDL Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

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
