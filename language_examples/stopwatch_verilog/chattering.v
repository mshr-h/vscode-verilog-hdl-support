module chattering
(
	input  wire rst_n,
	input  wire clk,
	input  wire bin_n,
	output reg  bout
);

reg [17:0] r_cnt;

wire en40hz = (r_cnt==250000-1);

always @(posedge clk or negedge rst_n) begin
	if(~rst_n)
		r_cnt <= 18'd0;
	else if(en40hz)
		r_cnt <= 18'd0;
	else
		r_cnt <= r_cnt + 18'd1;
end

reg ff1, ff2;

always @(posedge clk or negedge rst_n) begin
	if(~rst_n) begin
		ff2 <= 1'd0;
		ff1 <= 1'd0;
	end else if(en40hz) begin
		ff2 <= ff1;
		ff1 <= bin_n;
	end
end

wire w_tmp = ~ff1 & ff2 & en40hz;

always @(posedge clk or negedge rst_n) begin
	if(~rst_n)
		bout <= 1'd0;
	else
		bout <= w_tmp;
end

endmodule
