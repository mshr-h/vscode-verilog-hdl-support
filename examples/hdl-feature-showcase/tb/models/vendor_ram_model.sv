`include "config.svh"

module vendor_ram_model (
  input  logic                   clk,
  input  logic [`ADDR_WIDTH-1:0] addr,
  output logic [`DATA_WIDTH-1:0] rdata
);
  always_ff @(posedge clk) begin
    rdata <= {`DATA_WIDTH{addr[0]}};
  end
endmodule
