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

### Development setup

Use Node.js 24 and install the locked dependencies before building or testing:

```sh
npm ci
```

### Test lanes

The test suite is split by runtime dependency:

- `npm run test:core` runs deterministic unit tests and extension activation/command smoke tests in the VS Code host.
- `npm run test:native` runs integration tests for installed native HDL tools. The supported executables are `slang`, `iverilog`, `verilator`, `verible-verilog-format`, and `verible-verilog-lint`.
- `npm test` prepares the extension once, then runs both the core and native-tool lanes.
- `npm run test:minimum` runs the core lane against the minimum supported VS Code version, 1.107.0.
- `npm run test:slang-wasm-indexing` verifies the existing bundled WASM artifact and runs its indexing integration test.
- `npm run test:windows-wsl2` runs the Windows/WSL2 integration lane. It must be run on Windows with WSL2 available, and the WSL2 distribution must provide Verilator.

Missing native tools are reported as pending tests during local development. CI can require a comma-separated set of executables and turn a missing tool into a failure, for example:

```sh
VERILOGHDL_REQUIRED_NATIVE_TOOLS=slang,iverilog npm run test:native
```

The public test commands perform their own lint/build preparation. Their matching `:run` scripts skip preparation and are intended for CI jobs that have already run `npm run test:build` and perform linting in a separate quality job.

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

`slang-server.wasm` and `slang-server.meta.json` are generated release artifacts and are not tracked in Git. The lock file, build scripts, and license notices are tracked; CI restores a matching cached bundle or builds it, then uploads the artifact for packaging.

Set `WASI_SDK_PATH` to use an existing WASI SDK install; the version must match the lock file. On a cache miss, GitHub Actions builds the same artifact on Ubuntu and uploads it as `slang-server-wasm`. The workflow does not commit the binary automatically.

The production bundled runtime uses the Microsoft VS Code WASM/WASI language-server path through `@vscode/wasm-wasi` and `@vscode/wasm-wasi-lsp`. The extension includes `ms-vscode.wasm-wasi-core` in its extension pack so the WASM WASI Core provider is installed with the extension without blocking activation. Maintainers can temporarily force the legacy Node helper with `VERILOGHDL_SLANG_WASM_RUNTIME=node` when debugging runtime differences.

Before publishing a VSIX, run:

```sh
npm run package
npm run verify:vsix -- veriloghdl-*.vsix
```

`npm run package` fails if the bundled WASM artifact, metadata, or license notices are missing.
It uses the repository-pinned `@vscode/vsce` version and runs the production prepublish build once. The resulting VSIX is uploaded in CI as the `veriloghdl-vsix` artifact.

### Publishing a release

Publishing is tag-driven and must be started manually. Update the version in `package.json` and the release notes in `CHANGELOG.md`, complete the test and package checks above, then create and push a matching `vX.Y.Z` tag. The publish workflow rejects a tag that does not match `package.json`; after validation it restores or rebuilds and verifies the WASM bundle, rebuilds the VSIX, then publishes that same VSIX to Open VSX and the VS Code Marketplace. Do not create or push a release tag from an automated code-change workflow.
