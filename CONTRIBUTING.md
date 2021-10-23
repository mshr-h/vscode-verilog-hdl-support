# Contributing to Verilog-HDL/SystemVerilog Support for VS Code

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing this repository. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

[Take a look at our list of planned features.](https://github.com/mshr-h/vscode-verilog-hdl-support/issues/25) Choose a feature you are comfortable with and start working on it!

Or, any other contribution is also welcome! (fixing typo, refactoring, documentation, and so on). It is always preferred to file an issue about the feature you are going to work on and then send a pull request.

## Steps to follow

1.  File an issue about your new feature
2.  Fork this repository
3.  Create your feature branch
4.  Make your changes
5.  Add your changes to **CHANGELOG** under "Unreleased"
6.  Edit the **README**
    -   List of Configuration Settings
    -   Table of Compatability
    -   Add References/Thanks
    -   anything else...
7.  Commit your changes
8.  Push to the branch
9.  Create a new Pull Request
10. And wait patiently :smile:

## Developpers guide

### VSCode formatting seetings

For those of who using VSCode, install [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) and then put the below setting into VSCode settings.

```json
{
    "[typescript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    }
}
```
