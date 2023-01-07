`default_nettype none
module ram_sp
#(
  parameter DWIDTH  = 8,
  parameter AWIDTH  = 12,
  parameter CONTENT = "./memory.txt"
) (
  input  wire              clock,
  input  wire              wren,
  input  wire [AWIDTH-1:0] address,
  input  wire [DWIDTH-1:0] data,
  output reg  [DWIDTH-1:0] q
);

reg [DWIDTH-1:0] core [0:2**AWIDTH-1];

initial begin
  $readmemh(CONTENT, core);
end

// write port
always @(posedge clock) begin
  if(wren)
    core[address] <= data;
end

// read port
always @(posedge clock) begin
  q <= core[address];
end

endmodule
`default_nettype wire
