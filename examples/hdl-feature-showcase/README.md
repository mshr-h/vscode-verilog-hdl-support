# HDL Feature Showcase

This sample is a small SystemVerilog project for trying the extension's project-aware editing, HDL Explorer, semantic diagnostics, compile-unit linting, and inactive preprocessor region highlighting together.

## What this sample demonstrates

- Project-aware Go to Definition, hover, completions, and workspace symbols across packages, macros, includes, and modules.
- HDL Explorer compile units, include directories, defines, indexed modules/packages, hierarchy roots, and unresolved instances.
- Semantic diagnostics for unresolved modules, unknown named ports, unknown named parameters, unresolved includes, and unresolved macros.
- Compile-unit linting using project filelist context.
- Inactive preprocessor regions driven by active target defines.

## How to open the sample in VS Code

1. Open this folder as the workspace: `examples/hdl-feature-showcase/`.
2. Open `rtl/soc_top.sv`.
3. Run **Verilog: Reload Project** from the command palette.
4. Run **Verilog: Show Project Status** and confirm `rtl.f`, `sim.f`, and `broken.f` are listed.
5. Open the Explorer sidebar and find **HDL Explorer**. If needed, run **Verilog: Refresh HDL Explorer**.

The sample workspace settings enable the project model, semantic diagnostics, HDL Explorer, hierarchy, inactive regions, and compile-unit linting. The configured linter is `slang`; install it separately or change `verilog.linting.linter` to another supported tool.

## Project-Aware HDL Features walkthrough

1. Open `rtl/soc_top.sv`.
2. Use Go to Definition on the `uart_core` instance type and expect to land in `rtl/ip/uart_core.sv`.
3. Use Go to Definition on `` `include "config.svh"`` and expect to land in `rtl/include/config.svh`.
4. Hover over or Go to Definition on `` `DATA_WIDTH`` or `` `UART_BAUD`` and expect macro information from the include files.
5. Go to Definition on `bus_req_t` or `bus_rsp_t` and expect to land in `rtl/pkg/soc_types_pkg.sv`.
6. Run **Verilog: Show Project Modules** and confirm modules such as `soc_top`, `cpu_stub`, `uart_core`, `timer_core`, and `soc_ram` are indexed.
7. In `rtl/soc_top.sv`, use completion inside named port or parameter connections. Port and parameter snippets are available when `verilog.completion.autoConnectPorts` and `verilog.completion.autoConnectParameters` are enabled.

`rtl/ip/ram_wrapper.sv` contains module `soc_ram`, so resolving `soc_ram` demonstrates that the project index is semantic and not only filename-based.

## HDL Explorer and Hierarchy walkthrough

1. Run **Verilog: Select Active HDL Target** and choose `rtl.f`.
2. Run **Verilog: Refresh Hierarchy**.
3. In **HDL Explorer**, confirm the active target, compile units, include directories, defines, indexed modules, and package entries are visible.
4. Expand the hierarchy rooted at `soc_top`.
5. Confirm the hierarchy includes `cpu_stub`, `bus_mux`, `uart_core`, `timer_core`, `soc_ram`, `generic_ram`, and `feature_switch`.
6. Confirm `gpio_core` appears as unresolved where hierarchy diagnostics are shown.
7. Switch the active target to `sim.f`, refresh, and confirm `tb_soc` is available as a top-level testbench root.

Hierarchy detection is intentionally lightweight and does not perform full SystemVerilog elaboration.

## Semantic Diagnostics walkthrough

1. Run **Verilog: Select Active HDL Target** and choose `broken.f`.
2. Open `broken/bad_instance_top.sv`.
3. Expect diagnostics for:
   - `.BAUD_RATE`, because `uart_core` defines parameter `BAUD`.
   - `.rx_i`, because `uart_core` defines port `rx`.
   - `missing_accelerator`, because the module is intentionally absent.
4. Open `broken/diagnostics_playground.sv`.
5. Expect diagnostics for missing include `missing_header.svh` and unresolved macro `` `MISSING_MACRO``.
6. Open `rtl/soc_top.sv` and expect `gpio_core` to remain unresolved by design.

Unresolved macro diagnostics are enabled in `.vscode/settings.json` with `verilog.semanticDiagnostics.unresolvedMacros.enabled`.

## Compile-Unit Linting walkthrough

1. Install `slang` and make sure it is available on `PATH`, or configure its path with the extension's linting settings.
2. Open `rtl/soc_top.sv`.
3. Run **Verilog: Select Active HDL Target** and choose `rtl.f`.
4. Run **Verilog: Rerun lint tool**.
5. Change `verilog.linting.mode` between `file` and `compileUnit` and compare results.

File-mode linting sees the current file in isolation and may miss filelist include directories, defines, packages, or dependent modules. Compile-unit mode passes the active file's project compile unit to supported linters, so the linter can see ordered source files, include directories, and defines from the selected filelist.

Compile-unit mode is supported by Slang, Verilator, and Icarus Verilog. Verible, Xvlog, and ModelSim use file-mode linting. External linters such as `slang`, `verilator`, and `iverilog` must be installed separately and available on `PATH` or configured through extension settings.

## Inactive Preprocessor Regions walkthrough

1. Open `rtl/feature_switch.sv`.
2. Run **Verilog: Select Active HDL Target** and choose `rtl.f`.
3. Confirm the `FPGA` branch is active and the `SIMULATION` / fallback branches are inactive.
4. Switch the active target to `sim.f`.
5. Confirm the `SIMULATION` branch becomes active and the `FPGA` branch becomes inactive.
6. Open `rtl/ip/ram_wrapper.sv`.
7. Switch between `rtl.f` and `sim.f` and observe the active RAM implementation change between `generic_ram` and `vendor_ram_model`.

Inactive regions use project defines because `verilog.preprocessor.useProjectDefines` is enabled.

## Expected files and expected observations

| File | Intentional issue | Expected feature |
|---|---|---|
| `rtl/soc_top.sv` | `gpio_core` missing | unresolved hierarchy / unresolved module |
| `broken/bad_instance_top.sv` | `.rx_i` does not exist | unknown named port |
| `broken/bad_instance_top.sv` | `.BAUD_RATE` does not exist | unknown named parameter |
| `broken/bad_instance_top.sv` | `missing_accelerator` missing | unresolved module |
| `broken/diagnostics_playground.sv` | missing include | unresolved include |
| `broken/diagnostics_playground.sv` | missing macro | unresolved macro |
| `rtl/feature_switch.sv` | target-dependent `ifdef` branches | inactive region highlighting |
| `rtl/ip/ram_wrapper.sv` | target-dependent RAM implementation | inactive region + hierarchy difference |

## Troubleshooting

- If the project model looks stale, run **Verilog: Reload Project** and then **Verilog: Show Project Status**.
- If HDL Explorer does not update, run **Verilog: Refresh HDL Explorer**.
- If hierarchy does not update after switching targets, run **Verilog: Refresh Hierarchy**.
- If linting reports that `slang` cannot be found, install Slang or change `verilog.linting.linter` to `verilator`, `iverilog`, or `none`.
- If unresolved macro diagnostics are too noisy in your own projects, disable `verilog.semanticDiagnostics.unresolvedMacros.enabled`.
- If inactive regions do not change after switching targets, confirm `verilog.preprocessor.useProjectDefines` and `verilog.preprocessor.inactiveCode.enabled` are enabled.
