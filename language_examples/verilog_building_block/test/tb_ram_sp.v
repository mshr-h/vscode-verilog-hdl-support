`include "../rtl/ram_sp.v"
`default_nettype none
`timescale 1ms/1us

module tb_ram_sp;

parameter DWIDTH  = 8;
parameter AWIDTH  = 12;
parameter CONTENT = "./memory.txt";

reg               clock;
reg               wren;
reg  [AWIDTH-1:0] address;
reg  [DWIDTH-1:0] data;
wire [DWIDTH-1:0] q;

ram_sp
#(
  .DWIDTH  ( 8                   ),
  .AWIDTH  ( 12                  ),
  .CONTENT ( "./ram_content.txt" )
) _ram_sp
(
  .clock   ( clock   ),
  .wren    ( wren    ),
  .address ( address ),
  .data    ( data    ),
  .q       ( q       )
);

parameter CLK_PERIOD = 10.0;
always #(CLK_PERIOD/2) clock = ~clock;

integer i;
initial begin
  $dumpfile("tb_ram_sp.vcd");
  $dumpvars(0, tb_ram_sp);
  #1 clock=1'bx;wren=1'bx;address={AWIDTH{1'bx}};data={DWIDTH{1'bx}};
  #(CLK_PERIOD) clock=0;address=0;wren=0;data=0;
  for (i=0;i<=100;i=i+1) begin
    #(CLK_PERIOD) address=i;wren=1;data=(100-i);
  end
  #(CLK_PERIOD) wren=0;
  for (i=0;i<=100;i=i+1) begin
    #(CLK_PERIOD) address=i;
  end
  #(CLK_PERIOD*50);
  $finish(2);
end

endmodule
`default_nettype wire

