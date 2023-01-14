`ifdef VERILATOR
module adder (
`else
module Vadder (
`endif
  input clk,
  input [7:0] a,
  input [7:0] b,
  output logic [6:0] sum
);
  always @(posedge clk) begin
    sum <= a + b;
    $info("sum = %d", sum);
  end
  // assign sum = a ^ b;
  // assign carry = a & b;

endmodule