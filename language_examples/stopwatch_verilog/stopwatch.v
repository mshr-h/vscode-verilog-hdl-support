module stopwatch
(
	input  wire       clk,
	input  wire       rst_n,
	input  wire [1:0] btn_n,
	output wire [7:0] HEX0,
	output wire [7:0] HEX1,
	output wire [7:0] HEX2,
	output wire [7:0] HEX3
);

wire start_b;
wire stop_b;
wire en100hz;
wire clr;
wire en;
wire [3:0] msecqh;
wire [3:0] msecql;
wire [3:0] secqh;
wire [3:0] secql;
wire ca10msec;
wire ca100msec;
wire ca1sec;

chattering _chattering_start_b
(
	.rst_n(rst_n),
	.clk(clk),
	.bin_n(btn_n[0]),
	.bout(start_b)
);

chattering _chattering_stop_b
(
	.rst_n(rst_n),
	.clk(clk),
	.bin_n(btn_n[1]),
	.bout(stop_b)
);

divider _divider
(
	.rst_n(rst_n),
	.clk(clk),
	.en100hz(en100hz)
);

control _control
(
	.rst_n(rst_n),
	.clk(clk),
	.start_b(start_b),
	.stop_b(stop_b),
	.en(en),
	.clr(clr)
);

cnt10 _10msec
(
	.rst_n(rst_n),
	.clk(en100hz),
	.en(en),
	.clr(clr),
	.q(msecql),
	.ca(ca10msec)
);

cnt10 _100msec
(
	.rst_n(rst_n),
	.clk(en100hz),
	.en(ca10msec),
	.clr(clr),
	.q(msecqh),
	.ca(ca100msec)
);

cnt10 _1sec
(
	.rst_n(rst_n),
	.clk(en100hz),
	.en(ca100msec),
	.clr(clr),
	.q(secql),
	.ca(ca1sec)
);

cnt10 _10sec
(
	.rst_n(rst_n),
	.clk(en100hz),
	.en(ca1sec),
	.clr(clr),
	.q(secqh)
);

seg7dec H0
(
	.din(msecql),
	.HEX(HEX0[7:1])
);

seg7dec H1
(
	.din(msecqh),
	.HEX(HEX1[7:1])
);

seg7dec H2
(
	.din(secql),
	.HEX(HEX2[7:1])
);

seg7dec H3
(
	.din(secqh),
	.HEX(HEX3[7:1])
);

assign HEX0[0] = 1'b0;
assign HEX1[0] = 1'b0;
assign HEX2[0] = 1'b1;
assign HEX3[0] = 1'b0;

endmodule
