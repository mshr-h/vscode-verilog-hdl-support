`include "config.svh"

module generic_ram (
  input  logic                   clk,
  input  logic [`ADDR_WIDTH-1:0] addr,
  output logic [`DATA_WIDTH-1:0] rdata
);
  logic [`DATA_WIDTH-1:0] mem [0:15];

  always_ff @(posedge clk) begin
    rdata <= mem[addr[3:0]];
  end
endmodule
