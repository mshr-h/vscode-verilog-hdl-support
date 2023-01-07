`timescale 1ns/1ps
`default_nettype none
module button_debounce
#(
  parameter CLK_FREQ    = 10_000_000,
  parameter DEBOUNCE_HZ = 2
) (
  input  wire clk,
  input  wire rst_n,
  input  wire btn_in,
  output reg  btn_out
);

localparam COUNT_MAX = CLK_FREQ / DEBOUNCE_HZ;
localparam S_WAIT    = 0;
localparam S_FIRE    = 1;
localparam S_COUNT   = 2;

reg [$clog2(COUNT_MAX):0] count;
reg [1:0] state, next_state;

always @(posedge clk or negedge rst_n)
  state <= (~rst_n) ? S_WAIT : next_state;

always @(posedge clk or negedge rst_n) begin
  if(~rst_n) begin
    btn_out <= 0;
    count   <= 0;
  end
  else begin
    btn_out <= 0;
    count   <= 0;
    case(state)
      S_WAIT : begin
      end
      S_FIRE : begin
        btn_out <= 1;
      end
      S_COUNT : begin
        count <= count + 1;
      end
    endcase
  end
end

always @(*) begin
  case(state)
    S_WAIT  : next_state <= (btn_in) ? S_FIRE : state;
    S_FIRE  : next_state <= S_COUNT;
    S_COUNT : next_state <= (count > COUNT_MAX - 1) ? S_WAIT : state;
    default : next_state <= S_WAIT;
  endcase
end

endmodule
`default_nettype wire
