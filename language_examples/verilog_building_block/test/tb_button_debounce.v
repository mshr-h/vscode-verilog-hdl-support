`include "../rtl/button_debounce.v"
`default_nettype none
`timescale 1ms/1us

module tb_button_debounce;

parameter CLK_FREQ    = 1_000;
parameter DEBOUNCE_HZ = 40;

reg  clk;
reg  rst_n;
reg  btn_in;
wire btn_out;

button_debounce
#(
  .CLK_FREQ(CLK_FREQ),
  .DEBOUNCE_HZ(DEBOUNCE_HZ)
) _button_debounce
(
  .clk     ( clk     ),
  .rst_n   ( rst_n   ),
  .btn_in  ( btn_in  ),
  .btn_out ( btn_out )
);

parameter CLK_PERIOD = 10.0;
always #(CLK_PERIOD/2) clk = ~clk;

initial begin
  $dumpfile("tb_button_debounce.vcd");
  $dumpvars(0, tb_button_debounce);
  #1 rst_n=1'bx;clk=1'bx;btn_in=1'bx;
  #(CLK_PERIOD) rst_n=1;
  #(CLK_PERIOD) rst_n=0;clk=0;
  #(CLK_PERIOD) rst_n=1;
  #(CLK_PERIOD) btn_in=0;
  #(CLK_PERIOD*50);
  $finish(2);
end

always begin
  #(CLK_PERIOD*10)  btn_in=~btn_in;
  #(CLK_PERIOD/100) btn_in=~btn_in;
  #(CLK_PERIOD/100) btn_in=~btn_in;
  #(CLK_PERIOD/100) btn_in=~btn_in;
  #(CLK_PERIOD/100) btn_in=~btn_in;
  #(CLK_PERIOD/100) btn_in=~btn_in;
  #(CLK_PERIOD/100) btn_in=~btn_in;
  #(CLK_PERIOD/100) btn_in=~btn_in;
  #(CLK_PERIOD/100) btn_in=~btn_in;
end

endmodule
`default_nettype wire
