`include "../rtl/fib.v"

`default_nettype none
module tb_fib;

localparam
  N_IN = 7,
  N_OUT = 64;

reg              rst_n;
reg              clk;
reg              req;
reg  [N_IN-1:0]  n;
wire             ack;
wire [N_OUT-1:0] result;

fib
#(
  .N_IN  ( N_IN  ),
  .N_OUT ( N_OUT )
) fib_1
(
  .rst_n  ( rst_n  ),
  .clk    ( clk    ),
  .req    ( req    ),
  .n      ( n      ),
  .ack    ( ack    ),
  .result ( result )
);

parameter CLK_PERIOD = 10;
always #(CLK_PERIOD/2) clk = ~clk;

initial begin
  $dumpfile("tb_fib.vcd");
  $dumpvars(0, tb_fib);
end

initial begin
  #1 rst_n<=1'bx;clk<=1'bx;req<=1'bx;n<={N_IN{1'bx}};
  #(CLK_PERIOD) rst_n<=1;
  #(CLK_PERIOD*3) rst_n<=0;clk<=0;req<=0;n<=0;
  repeat(5) @(posedge clk);
  rst_n<=1;
  repeat(5) @(posedge clk);
  n<=66;
  repeat(5) @(posedge clk);
  req<=1;
  while(~ack) @(posedge clk);
  repeat(10) @(posedge clk);
  $finish(2);
end

endmodule
`default_nettype wire
