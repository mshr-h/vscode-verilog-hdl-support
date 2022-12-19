`include "../rtl/adder_tree.v"
`default_nettype none
`timescale 1ms/1us

module tb_adder_tree;

parameter WORD_SIZE = 8;
parameter BANK_SIZE = 4;

reg  clk;
reg  rst_n;
reg  [WORD_SIZE*BANK_SIZE-1:0]     in;
wire [(WORD_SIZE+1)*(BANK_SIZE/2)-1:0] out;

adder_tree
#(
  .WORD_SIZE(WORD_SIZE),
  .BANK_SIZE(BANK_SIZE)
) _adder_tree
(
  .clk   ( clk   ) ,
  .rst_n ( rst_n ) ,
  .in    ( in    ) ,
  .out   ( out   )
);

parameter CLK_PERIOD = 10.0;
always #(CLK_PERIOD/2) clk = ~clk;

initial begin
  $dumpfile("tb_adder_tree.vcd");
  $dumpvars(0, tb_adder_tree);
  #1 rst_n<=1'bx;clk<=1'bx;in<=32'hxxxx_xxxx;
  #(CLK_PERIOD) rst_n<=1;
  #(CLK_PERIOD*3) rst_n<=0;clk<=0;in<=0;
  repeat(5) @(posedge clk);
  rst_n<=1;
  @(posedge clk);
  in<={8'd1,8'd2,8'd3,8'd4};
  repeat(2) @(posedge clk);
  if(out !== {9'd3,9'd7})
    $display("result == ", 9'd3, ", ", 9'd7, " expected but ", out[17:9], ", ", out[8:0]);
  in<={8'd15,8'd255,8'd255,8'd255};
  repeat(2) @(posedge clk);
  if(out !== {9'd270,9'd510})
    $display("result == ", 9'd270, ", ", 9'd510, " expected but ", out[17:9], ", ", out[8:0]);
  repeat(5) @(posedge clk);
  $finish(2);
end

endmodule
`default_nettype wire
