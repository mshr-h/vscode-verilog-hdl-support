# slang/getModuleSignature Design Note

`slang-server` currently exposes module, scope, hierarchy, and instance data through
custom `workspace/executeCommand` commands, but it does not expose a stable request
that returns a module's full port and parameter signature.

The extension keeps **Verilog: Instantiate Module** as a slang-server backed workflow
by selecting module names from `slang.getModulesInFile` and inserting a minimal
instance. Full port and parameter expansion should move to a server-provided custom
request instead of reintroducing TypeScript parsing, ctags, FastScanner, or
SemanticIndex.

Proposed command/request:

```ts
interface ModuleSignature {
  moduleName: string;
  declaration: Location;
  parameters: Array<{
    name: string;
    type?: string;
    defaultValue?: string;
    location: Location;
  }>;
  ports: Array<{
    name: string;
    direction?: string;
    type?: string;
    location: Location;
  }>;
}
```

Suggested name:

```text
slang/getModuleSignature
```

Until this exists upstream or in a maintained fork, the extension should rely on
slang-server completion and code actions for port and parameter expansion.
