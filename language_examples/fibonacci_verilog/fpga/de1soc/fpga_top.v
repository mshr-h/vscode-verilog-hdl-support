module fpga_top
(
  input  wire       CLOCK_50,
  input  wire       CLOCK2_50,
  input  wire       CLOCK3_50,
  input  wire       CLOCK4_50,
  output wire [6:0] HEX0,
  output wire [6:0] HEX1,
  output wire [6:0] HEX2,
  output wire [6:0] HEX3,
  output wire [6:0] HEX4,
  output wire [6:0] HEX5,
  input  wire [3:0] KEY,
  input  wire [9:0] SW,
  output wire [9:0] LEDR
);

parameter
  N_IN  = 10,
  N_OUT = 24;

reg              req;
wire [N_IN-1:0]  n;
wire             ack;
wire [N_OUT-1:0] result;

wire clk = CLOCK_50;
wire RSTN = KEY[2];

// detect falling edge
reg [1:0] ff_req_raise = 0;
reg [1:0] ff_req_fall  = 0;
always @(posedge clk) begin
  ff_req_raise <= {ff_req_raise[0], KEY[0]};
  ff_req_fall  <= {ff_req_fall [0], KEY[1]};
end
wire tri_raise = (ff_req_raise == 2'b10);
wire tri_fall  = (ff_req_fall  == 2'b10);

always @(posedge clk or negedge RSTN) begin
  if(~RSTN)
    req <= 0;
  else if(tri_raise)
    req <= 1;
  else if(tri_fall)
    req <= 0;
end

fib
#(
  .N_IN  ( N_IN  ) ,
  .N_OUT ( N_OUT )
) fib_1
(
  .rst_n  ( RSTN   ) ,
  .clk    ( clk    ) ,
  .req    ( req    ) ,
  .n      ( n      ) ,
  .ack    ( ack    ) ,
  .result ( result )
);

assign LEDR[0] = req;
assign LEDR[1] = ack;

assign n = SW;

assign HEX5 = seg7dec(result[23:20]);
assign HEX4 = seg7dec(result[19:16]);
assign HEX3 = seg7dec(result[15:12]);
assign HEX2 = seg7dec(result[11: 8]);
assign HEX1 = seg7dec(result[ 7: 4]);
assign HEX0 = seg7dec(result[ 3: 0]);

function [6:0] seg7dec;
  input [3:0] din;
  begin
    case(din)
      4'h0:    seg7dec = 7'b100_0000;
      4'h1:    seg7dec = 7'b111_1001;
      4'h2:    seg7dec = 7'b010_0100;
      4'h3:    seg7dec = 7'b011_0000;
      4'h4:    seg7dec = 7'b001_1001;
      4'h5:    seg7dec = 7'b001_0010;
      4'h6:    seg7dec = 7'b000_0010;
      4'h7:    seg7dec = 7'b111_1000;
      4'h8:    seg7dec = 7'b000_0000;
      4'h9:    seg7dec = 7'b001_0000;
      4'hA:    seg7dec = 7'b000_1000;
      4'hB:    seg7dec = 7'b000_0011;
      4'hC:    seg7dec = 7'b010_0111;
      4'hD:    seg7dec = 7'b010_0001;
      4'hE:    seg7dec = 7'b000_0110;
      4'hF:    seg7dec = 7'b000_1110;
      default: seg7dec = 7'b111_1111;
    endcase
  end
endfunction

endmodule
