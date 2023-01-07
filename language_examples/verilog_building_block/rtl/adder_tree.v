`timescale 1ns/1ps
`default_nettype none
module adder_tree
#(
  parameter WORD_SIZE = 8,
  parameter BANK_SIZE = 16
) (
  input  wire                               clk,
  input  wire                               rst_n,
  input  wire [WORD_SIZE*BANK_SIZE-1:0]     in,
  output wire [(WORD_SIZE+1)*(BANK_SIZE/2)-1:0] out
);

genvar i;

reg  [WORD_SIZE-1:0] ireg [0:BANK_SIZE-1];
wire [WORD_SIZE:0]   owire [0:BANK_SIZE/2-1];

generate // unpack
for (i = 0; i < BANK_SIZE; i = i + 1) begin : PACKING
  always @(posedge clk or negedge rst_n) begin
    if (~rst_n)
      ireg[i] <= 0;
    else
      ireg[i] <= in[(i+1)*WORD_SIZE-1:i*WORD_SIZE];
  end
end
endgenerate // unpack

generate
for (i = 0; i < BANK_SIZE/2; i = i + 1) begin : ADDER_TREE
  assign owire[i] = ireg[i*2] + ireg[i*2+1];
end
endgenerate

generate // pack
for (i = 0; i < BANK_SIZE/2; i = i + 1) begin : UNPACKING
  assign out[(i+1)*(WORD_SIZE+1)-1:i*(WORD_SIZE+1)] = owire[i];
end
endgenerate // pack

endmodule
`default_nettype wire

