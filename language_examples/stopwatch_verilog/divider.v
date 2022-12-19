module divider
(
	input  wire rst_n,
	input  wire clk, // 10MHz
	output wire en100hz
);

reg [16:0] r_cnt;

always @(posedge clk or negedge rst_n) begin
	if(~rst_n)
		r_cnt <= 17'd0;
	else begin
		if(en100hz)
			r_cnt <= 17'd0;
		else
			r_cnt <= r_cnt + 17'd1;
	end
end

assign en100hz = (r_cnt == 17'd99_999);

endmodule
