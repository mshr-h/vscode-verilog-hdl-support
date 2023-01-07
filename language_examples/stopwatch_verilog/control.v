module control
(
	input  wire rst_n,
	input  wire clk,
	input  wire start_b,
	input  wire stop_b,
	output wire en,
	output wire clr
);

parameter INIT = 2'b00; // initial state
parameter COUNTING = 2'b01; // measuring state
parameter PAUSE = 2'b10; // pause state

reg [1:0] r_state; // current state

assign en = (r_state == COUNTING);
assign clr = (r_state == INIT);

always @(posedge clk or negedge rst_n) begin
	if(~rst_n)
		r_state <= INIT;
	else begin
		case(r_state)
			INIT :
				if(start_b)
					r_state <= COUNTING;
				else
					r_state <= INIT;
			COUNTING :
				if(stop_b)
					r_state <= PAUSE;
				else
					r_state <= COUNTING;
			PAUSE :
				if(start_b)
					r_state <= COUNTING;
				else if(stop_b)
					r_state <= INIT;
				else
					r_state <= PAUSE;
			default : r_state <= 2'bxx;
		endcase
	end
end

endmodule
