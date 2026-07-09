# Issue 633 Repro: undefined module diagnostics with incomplete build context

この sample は vscode-verilog-hdl-support issue #633 の再現用です。

目的は、`rtl/top_module.v` と同じ directory や同じ workspace 内に module 定義ファイルが存在していても、slang-server や external linter の build context にその source が入っていなければ `undefined module` と診断され得ることを確認することです。

## 使用想定

- VS Code Desktop
- `mshr-h.veriloghdl` v1.28.1
- external linter は `none`
- `slang-server` は enabled
- Verilog source は `.v` のみ

各 workspace の `.vscode/settings.json` は、external linter の診断と slang-server の診断が混ざらないようにしています。

```json
{
  "verilog.linting.linter": "none",
  "verilog.slangServer.enabled": true,
  "verilog.slangServer.runtime": "auto",
  "verilog.slangServer.trace.server": "off"
}
```

## Directory layout

```text
examples/issue-633-repro/
  README.md
  01-failing-no-slang-config/
    .vscode/
      settings.json
      settings.iverilog-includePath-only.json
      settings.iverilog-library-search.json
    rtl/
      top_module.v
      DAC1220_control.v
      adc_capture.v
    vivado_ip/
      ila_0/
        ila_0.v
      vio_0/
        vio_0.v
    filelists/
      top_only.f
      all_sources.f
  02-failing-incomplete-slang-config/
    .vscode/
      settings.json
      settings.iverilog-includePath-only.json
      settings.iverilog-library-search.json
    .slang/
      server.json
    rtl/
      top_module.v
      DAC1220_control.v
      adc_capture.v
    vivado_ip/
      ila_0/
        ila_0.v
      vio_0/
        vio_0.v
    filelists/
      top_only.f
      all_sources.f
  03-fixed-complete-slang-config/
    .vscode/
      settings.json
      settings.iverilog-includePath-only.json
      settings.iverilog-library-search.json
    .slang/
      server.json
    rtl/
      top_module.v
      DAC1220_control.v
      adc_capture.v
    vivado_ip/
      ila_0/
        ila_0.v
      vio_0/
        vio_0.v
    filelists/
      top_only.f
      all_sources.f
```

## Reproduction steps

### 1. No slang config

1. VS Code で `examples/issue-633-repro/01-failing-no-slang-config/` を workspace として開きます。
2. `rtl/top_module.v` を開きます。
3. Problems panel または hover で `DAC1220_control`, `adc_capture`, `ila_0`, `vio_0` が `undefined module` になるか確認します。
4. Problems panel の `Source` column、hover、または **Verilog: Show slang-server Output** で、診断 source が `slang` であることを確認します。

この workspace には `.slang/server.json` がありません。純 Verilog `.v` だけの project では初回設定誘導が出にくい場合があり、slang-server が current file だけを見て未解決 module を診断する可能性を確認するための case です。

### 2. Incomplete slang config

1. VS Code で `examples/issue-633-repro/02-failing-incomplete-slang-config/` を workspace として開きます。
2. `rtl/top_module.v` を開きます。
3. `DAC1220_control.v`, `adc_capture.v`, `ila_0.v`, `vio_0.v` は workspace 内に存在します。
4. それでも `.slang/server.json` の `build` と `flags` が `filelists/top_only.f` だけを参照しているため、`DAC1220_control`, `adc_capture`, `ila_0`, `vio_0` が `undefined module` と診断されることを確認します。
5. 診断 source が `slang` であることを確認します。

この case は、file が存在して index 対象 directory に入っていても、active build context に source file が含まれていなければ module 解決には使われないことを deterministically に示します。

### 3. Complete slang config

1. VS Code で `examples/issue-633-repro/03-fixed-complete-slang-config/` を workspace として開きます。
2. `rtl/top_module.v` を開きます。
3. `filelists/all_sources.f` に全 source が含まれているため、`DAC1220_control`, `adc_capture`, `ila_0`, `vio_0` の `undefined module` が解消することを確認します。

`02-failing-incomplete-slang-config/` と `03-fixed-complete-slang-config/` の主な違いは `.slang/server.json` が参照する filelist です。

```json
{
  "flags": "-f filelists/top_only.f",
  "build": "filelists/top_only.f"
}
```

```json
{
  "flags": "-f filelists/all_sources.f",
  "build": "filelists/all_sources.f"
}
```

## Expected observations

- failing case では module 定義ファイルが workspace に存在しても、active build context に入っていないため `undefined module` になります。
- fixed case では `.slang/server.json` の `flags` と `build` が全 source を含む `filelists/all_sources.f` を指すため、module 解決が成功します。
- issue #633 の原因確認では、「file exists かどうか」ではなく「slang-server/linter に渡される build context に含まれているか」を確認する必要があります。

## Diagnostic source の確認方法

- Problems panel で `Source` column を表示し、`slang` と表示されていることを確認します。
- Hover の診断表示で source が表示される場合は、そこでも確認できます。
- **Verilog: Show slang-server Output** で slang-server が起動していることや config/build file の扱いを確認できます。
- external linter の診断と混ざる場合は、workspace の `.vscode/settings.json` で `verilog.linting.linter` が `none` になっていることを確認します。

## Optional: Icarus Verilog comparison

各 workspace には optional な Icarus Verilog 用 settings を 2 つ置いています。試す場合は、対象 workspace 内でどちらかを `.vscode/settings.json` にコピーして VS Code を reload してください。

```sh
cp .vscode/settings.iverilog-includePath-only.json .vscode/settings.json
```

または:

```sh
cp .vscode/settings.iverilog-library-search.json .vscode/settings.json
```

`settings.iverilog-includePath-only.json` は次のように include path だけを設定します。

```json
{
  "verilog.linting.linter": "iverilog",
  "verilog.linting.iverilog.includePath": [
    "rtl",
    "vivado_ip/ila_0",
    "vivado_ip/vio_0"
  ]
}
```

`verilog.linting.iverilog.includePath` は preprocessor の `` `include`` 探索用です。sibling/source module の `.v` file を compilation unit に自動追加するものではないため、`includePath-only` では `undefined module` になり得ます。

`settings.iverilog-library-search.json` は次のように library directory search を使います。

```json
{
  "verilog.linting.linter": "iverilog",
  "verilog.linting.iverilog.arguments": "-Y .v -y rtl -y vivado_ip/ila_0 -y vivado_ip/vio_0"
}
```

この sample では module name と file name が一致しているため、`-y` / `-Y` による library search では `DAC1220_control`, `adc_capture`, `ila_0`, `vio_0` を解決できます。Icarus Verilog で filelist を使う場合は、次のように全 source を渡してください。

```sh
iverilog -t null -f filelists/all_sources.f
```

## Notes

- `ila_0` と `vio_0` は Vivado-generated IP の実物ではなく、この sample 用に hand-written した最小 stub です。
- proprietary な Xilinx generated source は含めていません。
- Windows でも扱いやすいように symlink は使わず、各 workspace に同じ source file をコピーしています。