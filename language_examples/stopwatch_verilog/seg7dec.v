module seg7dec
(
	input  wire [3:0] din,
	output reg  [6:0] HEX
);

always @(*) begin
	case(din)
		4'd0:    HEX <= 7'b111_1110;
		4'd1:    HEX <= 7'b011_0000;
		4'd2:    HEX <= 7'b110_1101;
		4'd3:    HEX <= 7'b111_1001;
		4'd4:    HEX <= 7'b011_0011;
		4'd5:    HEX <= 7'b101_1011;
		4'd6:    HEX <= 7'b101_1111;
		4'd7:    HEX <= 7'b111_0000;
		4'd8:    HEX <= 7'b111_1111;
		4'd9:    HEX <= 7'b111_1011;
		default: HEX <= 7'b111_1111;
	endcase
end

endmodule

