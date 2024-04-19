module test();

my_module 
#(.dwidth(32'd1))
u_my_module
(.clk(clk), .data_i(data_in), .data_o(data_out));

my_module  #(.dwidth(32'd1))
u_my_module
(.clk(clk), .data_i(data_in), .data_o(data_out));

endmodule