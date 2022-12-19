`include "../rtl/shift_register.v"
`default_nettype none
`timescale 1ms/1us

module tb_shift_register;

parameter DEPTH = 4;
parameter WIDTH = 4;

reg  clk;
reg  rst_n;
reg  en;
reg [WIDTH-1:0] d;
wire [WIDTH-1:0] q;

shift_register
#(
  .DEPTH(DEPTH),
  .WIDTH(WIDTH)
) _shift_register
(
  .clk   ( clk   ) ,
  .rst_n ( rst_n ) ,
  .en    ( en    ) ,
  .d     ( d     ) ,
  .q     ( q     )
);

parameter CLK_PERIOD = 10.0;
always #(CLK_PERIOD/2) clk = ~clk;

initial begin
  $dumpfile("tb_shift_register.vcd");
  $dumpvars(0, tb_shift_register);
  #1 rst_n<=1'bx;clk<=1'bx;en<=1'bx;d<={WIDTH{1'bx}};
  #(CLK_PERIOD) rst_n<=1;
  #(CLK_PERIOD*3) rst_n<=0;clk<=0;en<=0;d<=0;
  repeat(5) @(posedge clk);
  rst_n<=1;
  @(posedge clk);
  d<=1;
  @(posedge clk);
  en<=1;
  @(posedge clk);
  d<=2;
  @(posedge clk);
  d<=3;
  @(posedge clk);
  d<=4;
  @(posedge clk);
  d<=5;
  @(posedge clk);
  if(q !== 1)
    $display("result == ", 1, " expected but ", q);
  d<=6;
  @(posedge clk);
  if(q !== 2)
    $display("result == ", 2, " expected but ", q);
  d<=7;
  @(posedge clk);
  if(q !== 3)
    $display("result == ", 3, " expected but ", q);
  d<=8;
  @(posedge clk);
  if(q !== 4)
    $display("result == ", 4, " expected but ", q);
  en<=0;
  @(posedge clk);
  if(q !== 5)
    $display("result == ", 5, " expected but ", q);
  repeat(5) @(posedge clk);
  $finish(2);
end

endmodule
`default_nettype wire
