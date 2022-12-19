`include "../rtl/uart_rx.v"
`default_nettype none
`timescale 1ns/1ps

module tb_uart_rx;

reg        clk;
reg        rst_n;
reg        rx_in;
wire [7:0] rx_data;
wire       rx_rdy;

uart_rx
_uart_rx
(
  .clk     ( clk     ),
  .rst_n   ( rst_n   ),
  .rx_in   ( rx_in   ),
  .rx_data ( rx_data ),
  .rx_rdy  ( rx_rdy  )
);

parameter CLK_PERIOD = 10.0;
always #(CLK_PERIOD/2) clk = ~clk;

initial begin
  $dumpfile("tb_uart_rx.vcd");
  $dumpvars(0, tb_uart_rx);
  #1 rst_n<=1'bx;clk<=1'bx;rx_in<=1'bx;
  #(CLK_PERIOD) rst_n<=1;
  #(CLK_PERIOD*3) rst_n<=0;clk<=0;rx_in<=1;
  repeat(5) @(posedge clk);
  rst_n<=1;
  @(posedge clk);
  rx_in<=0;
  @(posedge clk);
  rx_in<=1;
  @(posedge clk);
  rx_in<=1;
  @(posedge clk);
  rx_in<=0;
  @(posedge clk);
  rx_in<=0;
  @(posedge clk);
  rx_in<=1;
  @(posedge clk);
  rx_in<=0;
  @(posedge clk);
  rx_in<=1;
  @(posedge clk);
  rx_in<=1;
  @(posedge clk);
  rx_in<=1;
  @(posedge clk);
  if (rx_data !== 8'b11010011)
    $display("result == %b, expected but %b", rx_data, 8'b11010011);
  repeat(5) @(posedge clk);
  $finish(2);
end

endmodule
`default_nettype wire
