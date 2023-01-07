module cnt10
(
	input  wire       rst_n,
	input  wire       clk,
	input  wire       en,
	input  wire       clr,
	output reg  [3:0] q,
	output wire       ca
);

always @(posedge clk or negedge rst_n) begin
	if(~rst_n)
		q = 4'd0;
	else if(clr)
		q = 4'd0;
	else if(en) begin
		if(q == 4'd9)
			q = 4'd0;
		else
			q = q + 4'd1;
	end
end

assign ca = (q == 4'd9) && en;

endmodule
