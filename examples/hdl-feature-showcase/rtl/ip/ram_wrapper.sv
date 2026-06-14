`include "config.svh"

module soc_ram (
  input  logic                   clk,
  input  logic [`ADDR_WIDTH-1:0] addr,
  output logic [`DATA_WIDTH-1:0] rdata
);
`ifdef USE_VENDOR_RAM_MODEL
  vendor_ram_model u_ram (
    .clk   (clk),
    .addr  (addr),
    .rdata (rdata)
  );
`else
  generic_ram u_ram (
    .clk   (clk),
    .addr  (addr),
    .rdata (rdata)
  );
`endif
endmodule
