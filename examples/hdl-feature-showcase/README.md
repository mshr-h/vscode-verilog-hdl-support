# HDL Feature Showcase

This sample is a small SystemVerilog workspace for trying the extension with
`slang-server` as the project-aware HDL engine.

The workspace is configured with `.slang/server.json`, which is the source of
project truth for slang-server.

## What this sample demonstrates

- `slang-server` diagnostics, Go to Definition, hover, completion, symbols, and references.
- HDL Explorer data coming from slang-server commands.
- Build-file and top-level selection through slang-server.
- `.slang/server.json` validation and Doctor reporting.
- Inactive preprocessor region highlighting from configured editor defines.

## Workspace layout

- `.slang/server.json` is the slang-server project config.
- `filelists/rtl.f` is the default RTL build.
- `filelists/sim.f` adds the testbench and simulation RAM model.
- `filelists/broken.f` is intentionally incomplete for diagnostics checks.
- `rtl/`, `tb/`, and `broken/` are indexed by slang-server.

## Open the sample

1. Open this folder as the workspace: `examples/hdl-feature-showcase/`.
2. Open `rtl/soc_top.sv`.
3. Run **Verilog: Doctor**.
4. Confirm the report shows:
   - slang-server is enabled.
   - runtime is `bundled-wasm`, `native`, or `auto`.
   - `.slang/server.json` is found and valid.
   - build is `filelists/rtl.f`.
5. If slang-server is not running, run **Verilog: Restart slang-server** and check
   **Verilog: Show slang-server Output**.

## Slang project config

The sample config uses:

```json
{
  "flags": "-f filelists/rtl.f",
  "build": "filelists/rtl.f",
  "builds": [
    { "name": "rtl", "glob": "filelists/rtl.f" },
    { "name": "sim", "glob": "filelists/sim.f" },
    { "name": "broken", "glob": "filelists/broken.f" }
  ]
}
```

Useful commands:

- **Verilog: Open Slang Project Config**
- **Verilog: Validate Slang Project Config**
- **Verilog: Set slang-server Build File**
- **Verilog: Set slang-server Top Level**

## Language feature walkthrough

1. Open `rtl/soc_top.sv`.
2. Use Go to Definition on the `uart_core` instance type and expect to land in
   `rtl/ip/uart_core.sv`.
3. Use Go to Definition on `` `include "config.svh"`` and expect to land in
   `rtl/include/config.svh`.
4. Hover over or Go to Definition on `` `DATA_WIDTH`` or `` `UART_BAUD`` and
   expect information from slang-server.
5. Go to Definition on `bus_req_t` or `bus_rsp_t` and expect to land in
   `rtl/pkg/soc_types_pkg.sv`.
6. Try completion inside named port or parameter connections.

`rtl/ip/ram_wrapper.sv` contains module `soc_ram`, so resolving `soc_ram`
demonstrates that module lookup is not filename-only.

## HDL Explorer walkthrough

1. Run **Verilog: Refresh HDL Explorer**.
2. Confirm the **slang-server** section shows a running server or a clear
   unavailable state.
3. Confirm the **Build** section shows `.slang/server.json` and the configured
   build summary.
4. Expand **Modules** and look for `soc_top`, `cpu_stub`, `uart_core`,
   `timer_core`, and `soc_ram`.
5. Run **Verilog: Set slang-server Top Level** from `rtl/soc_top.sv`, or use the
   module context menu in HDL Explorer.
6. Expand **Hierarchy** and confirm slang-server returns hierarchy data.
7. Run **Verilog: Set slang-server Build File** and select `filelists/sim.f` to
   switch to the simulation build. Refresh HDL Explorer and look for `tb_soc`.

If a section is empty, check **Verilog: Show slang-server Output**. The extension
does not fall back to TypeScript-side HDL parsing.

## Diagnostics walkthrough

1. Run **Verilog: Set slang-server Build File** and select `filelists/broken.f`.
2. Open `broken/bad_instance_top.sv`.
3. Expect slang-server diagnostics for intentional issues such as:
   - `.BAUD_RATE`, because `uart_core` defines parameter `BAUD`.
   - `.rx_i`, because `uart_core` defines port `rx`.
   - `missing_accelerator`, because that module is intentionally absent.
4. Open `broken/diagnostics_playground.sv`.
5. Expect diagnostics for the missing include and missing macro if the active
   slang-server build analyzes that file.
6. Open `rtl/soc_top.sv` in the RTL build and note that `gpio_core` is
   intentionally absent for hierarchy and diagnostics experiments.

## Inactive preprocessor regions

Inactive branch highlighting is a local editor decoration. It is controlled by
`verilog.preprocessor.defines`, not by slang-server.

The sample starts with:

```json
"verilog.preprocessor.defines": ["FPGA", "HAS_UART"]
```

Try this:

1. Open `rtl/feature_switch.sv`.
2. Confirm the `FPGA` branch is active.
3. Change `verilog.preprocessor.defines` to `["SIMULATION"]`.
4. Confirm the `SIMULATION` branch becomes active.
5. Open `rtl/ip/ram_wrapper.sv` and compare the `generic_ram` and
   `vendor_ram_model` branches by changing the configured defines.

This decoration is only a lightweight editor aid. Project semantics and
diagnostics come from slang-server.

## Optional file-mode linting

The sample sets `verilog.linting.linter` to `none` so slang-server diagnostics
are not mixed with external linter output.

To try linting separately, install a supported linter and set
`verilog.linting.linter` to `slang`, `verilator`, `iverilog`, or another
supported file-mode linter.

## Troubleshooting

- If `.slang/server.json` is not detected, run **Verilog: Open Slang Project Config**.
- If config parsing fails, run **Verilog: Validate Slang Project Config**.
- If the server is stopped or in error state, run **Verilog: Restart slang-server**.
- If bundled WASM fails, run **Verilog: Show slang-server Output** and
  **Verilog: Doctor**.
- If native mode is desired, run **Verilog: Select slang-server Runtime** and
  choose a native `slang-server` executable.
- If HDL Explorer does not update after build or top changes, run
  **Verilog: Refresh HDL Explorer**.
