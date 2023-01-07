`include "./vga_display.v"

`timescale 1ns/1ns
`default_nettype none
module tb_vga_display;

parameter CYCLE = 10;

reg clk;
always #(CYCLE/2) clk <= ~clk;

reg rst_n;
wire vga_hs;
wire vga_vs;
wire vga_r;
wire vga_g;
wire vga_b;

vga_display
_vga_display
(
  .clk_pix ( clk    ),
  .rst_n   ( rst_n  ),
  .vga_hs  ( vga_hs ),
  .vga_vs  ( vga_vs ),
  .vga_r   ( vga_r  ),
  .vga_g   ( vga_g  ),
  .vga_b   ( vga_b  )
);


initial begin
  $dumpfile("tb_vga_display.vcd");
  $dumpvars(0, tb_vga_display);
  rst_n=1;clk=0;
  #(CYCLE*3) rst_n=0;
  #(CYCLE*5) rst_n=1;
  while(vga_vs==1)
    #(CYCLE*1);
  while(vga_vs==0)
    #(CYCLE*1);
  #(CYCLE*100);
  $finish(2);
end

endmodule
`default_nettype wire
