`include "../rtl/synchronizer.v"
`default_nettype none
`timescale 1ns/1ps

module tb_synchronizer;

parameter N = 8;

reg          clk;
reg  [N-1:0] unsynced_data;
wire [N-1:0] synced_data;

synchronizer
#(
  .N(N)
) _synchronizer
(
  .clk           ( clk           ),
  .unsynced_data ( unsynced_data ),
  .synced_data   ( synced_data   )
);

parameter CLK_PERIOD = 10.0;
always #(CLK_PERIOD/2) clk = ~clk;

initial begin
  $dumpfile("tb_synchronizer.vcd");
  $dumpvars(0, tb_synchronizer);
  #1 clk<=1'bx;unsynced_data<={N{1'bx}};
  #(CLK_PERIOD) clk=0;
  repeat(50) @(posedge clk);
  $finish(2);
end

always begin
  #(CLK_PERIOD*3) unsynced_data<=10;
  #(CLK_PERIOD/3) unsynced_data<=8;
  #(CLK_PERIOD/3) unsynced_data<=3;
  #(CLK_PERIOD/3) unsynced_data<=2;
  #(CLK_PERIOD/3) unsynced_data<=5;
  #(CLK_PERIOD/3) unsynced_data<=7;
  #(CLK_PERIOD/3) unsynced_data<=12;
  #(CLK_PERIOD/3) unsynced_data<=100;
  #(CLK_PERIOD/3) unsynced_data<=50;
end

endmodule
`default_nettype wire
