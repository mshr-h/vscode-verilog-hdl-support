module inactive_preprocessor_regions;
  logic [7:0] data;

`define ENABLE_FAST_PATH

`ifdef ENABLE_FAST_PATH
  assign data = 8'hf0;
`else
  assign data = 8'h0f;
`endif

`ifndef ENABLE_DEBUG_OUTPUT
  localparam bit DebugOutput = 1'b0;
`elsif ENABLE_VERBOSE_DEBUG
  localparam bit DebugOutput = 1'b1;
`else
  localparam bit DebugOutput = 1'b0;
`endif

  initial begin
    $display("data=%h debug=%0d", data, DebugOutput);
  end
endmodule
