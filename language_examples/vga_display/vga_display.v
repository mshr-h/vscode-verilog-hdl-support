// 640 x 480 @ 60 Hz
//   pixel clock: 25.157MHz
// 800 x 600 @ 60 Hz
//   pixel clock: 40MHz
`timescale 1ns/1ns
module vga_display
(
  input  wire clk_pix,
  input  wire rst_n,
  output wire vga_hs,
  output wire vga_vs,
  output wire vga_r,
  output wire vga_g,
  output wire vga_b
);

parameter VGA_MAX_H      = 800;
parameter VGA_MAX_V      = 525;
parameter VGA_WIDTH      = 640;
parameter VGA_HEIGHT     = 480;
parameter VGA_SYNH_START = 656;
parameter VGA_SYNV_START = 490;
parameter VGA_SYNH_END   = 752;
parameter VGA_SYNV_END   = 492;

reg [9:0] cnt_hs;
reg [9:0] cnt_vs;

always @(posedge clk_pix) begin
  if (~rst_n)
    cnt_hs <= 0;
  else if (cnt_hs < VGA_MAX_H)
    cnt_hs <= cnt_hs + 1'd1;
  else
    cnt_hs <= 0;
end

always @(posedge clk_pix) begin
  if (~rst_n)
    cnt_vs <= 0;
  else begin
    if (cnt_hs == 0) begin
      if (cnt_vs < VGA_MAX_V)
        cnt_vs <= cnt_vs + 1'd1;
      else
        cnt_vs <= 0;
    end
  end
end

assign vga_hs = ~((cnt_hs >= VGA_SYNH_START) && (cnt_hs < VGA_SYNH_END));
assign vga_vs = ~((cnt_vs >= VGA_SYNV_START) && (cnt_vs < VGA_SYNV_END));

assign vga_r = cnt_hs[6];
assign vga_g =~cnt_hs[6];
assign vga_b = cnt_hs[5];

endmodule
