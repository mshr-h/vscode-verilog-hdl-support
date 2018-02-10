# Verilog HDL support for VSCode [![Build Status](https://travis-ci.org/mshr-h/vscode-verilog-hdl-support.svg?branch=master)](https://travis-ci.org/mshr-h/vscode-verilog-hdl-support)
Verilog HDL support based on [https://github.com/textmate/verilog.tmbundle](https://github.com/textmate/verilog.tmbundle) TextMate package.

## Features
### Done
- Syntax highlighting for `.v` `.vh` files
- Simple Snippets
    * `module`
    * `always`
    * `case`
    * `for`
    * `while`
    * `function`
    * `reg`
    * `wire`
    * testbench template
    * etc...
- Linting
    * Use `verilog.linting.linter` to select linter.
        - Possible values are
            * `iverilog`
            * `xvlog`
    * Icarus Verilog
        - Make sure the path to your Icaurus Verilog installation is present in the `PATH` variable.
        - If your module references other designs from other .v files, use `` `include "module.v"`` syntax to include them in your design. IVerilog uses these `` `include "path/to/file.v"`` directives to refer those modules. The `path/to/file.v` should be relative to your workspace directory.
        - Use `verilog.iverilog.arguments` setting to add custom arguments to the linter. The argument `-t null` will be added by the linter automatically
    * xvlog(Vivado)

### In progress
- Icarus Verilog integration
    * Working in:
        - Windows: Yes
            * Tested on Windows 10 Fall Creators Update (build 16299). Visual Studio Code 1.19.1
        - Linux: Not Tested
        - macOS: Not Tested
- xvlog(Vivado) integration
    * Working in:
        - Windows: Yes
        - Ubuntu: Not Tested (Will be tested soon)
        - macOS: Not Tested

### In the future
- Please post issue if you have any new idea

## GitHub repos
[mshr-h/vscode-verilog-hdl-support](https://github.com/mshr-h/vscode-verilog-hdl-support)

## Contributing
Any contribution is welcome!(fixing typo, refactoring, documentation, and so on)

1. Fork it ( [https://github.com/mshr-h/vscode-verilog-hdl-support](https://github.com/mshr-h/vscode-verilog-hdl-support) )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

## See also
[https://marketplace.visualstudio.com/items/mshr-h.VerilogHDL](https://marketplace.visualstudio.com/items/mshr-h.VerilogHDL)
