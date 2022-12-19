`timescale 1ns/100ps
`default_nettype none
module synchronizer
#(
  parameter N = 8
) (
  input  wire         clk,
  input  wire [N-1:0] unsynced_data,
  output reg  [N-1:0] synced_data
);

reg [N-1:0] register;

always @(posedge clk) begin
  register    <= unsynced_data;
  synced_data <= register;
end

endmodule
`default_nettype wire

