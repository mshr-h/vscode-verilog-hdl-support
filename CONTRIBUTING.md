# Contributing to Verilog-HDL/SystemVerilog Support for VS Code

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing this repository. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

Any other contribution is also welcome! (fixing typo, refactoring, documentation, and so on). It is always preferred to file an issue about the feature you are going to work on and then send a pull request.

## Steps to follow

1. File an issue about your new feature
2. Fork this repository
3. Create your feature branch
4. Make your changes
5. Add your changes to **CHANGELOG** under "Unreleased"
6. Edit the **README**

    - List of Configuration Settings
    - Table of Compatability
    - Add References/Thanks
    - anything else...

7. Commit your changes
8. Push to the branch
9. Create a new Pull Request
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

### Rebuilding bundled slang-server.wasm

Maintainers can rebuild the bundled WASM artifact on macOS or Linux:

```sh
npm run build:slang-wasm
npm run verify:wasm-bundle
```

The build is pinned by `build/slang-server.lock.json`. The script checks out the locked `hudson-trading/slang-server` commit, verifies the locked `external/slang` submodule commit, uses WASI SDK 25.0, builds with CMake/Ninja, and writes:

- `resources/wasm/slang-server.wasm`
- `resources/wasm/slang-server.meta.json`
- `resources/wasm/licenses/*`

`slang-server.wasm` and `slang-server.meta.json` are generated release artifacts and are not tracked in Git. The lock file, build scripts, and license notices are tracked; CI builds and uploads the artifact for packaging.

Set `WASI_SDK_PATH` to use an existing WASI SDK install; the version must match the lock file. GitHub Actions builds the same artifact on Ubuntu and uploads it as `slang-server-wasm`. The workflow does not commit the binary automatically.

The production bundled runtime uses the Microsoft VS Code WASM/WASI language-server path through `@vscode/wasm-wasi` and `@vscode/wasm-wasi-lsp`. The extension includes `ms-vscode.wasm-wasi-core` in its extension pack so the WASM WASI Core provider is installed with the extension without blocking activation. Maintainers can temporarily force the legacy Node helper with `VERILOGHDL_SLANG_WASM_RUNTIME=node` when debugging runtime differences.

Before publishing a VSIX, run:

```sh
npm run package
npm run verify:vsix -- veriloghdl-*.vsix
```

`npm run package` fails if the bundled WASM artifact, metadata, or license notices are missing.
