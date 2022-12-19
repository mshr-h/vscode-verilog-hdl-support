`default_nettype none
module fib
#(
  parameter N_IN  = 7,
  parameter N_OUT = 90
)
(
  input  wire             rst_n,
  input  wire             clk,
  input  wire             req,
  input  wire [N_IN-1:0]  n,
  output reg              ack,
  output reg  [N_OUT-1:0] result
);

localparam
  INIT          = 2'b00,
  WAIT_REQ      = 2'b01,
  CALC          = 2'b10,
  WAIT_REQ_FALL = 2'b11;

reg [1:0]       state;
reg [N_IN-1:0]  n_reg;
reg [N_OUT-1:0] n_m1;
reg [N_OUT-1:0] n_m2;
reg [N_IN-1:0]  cnt;

always @(posedge clk or negedge rst_n) begin
  if(~rst_n) begin
    state  <= INIT;
    n_reg  <= 0;
    n_m1   <= 0;
    n_m2   <= 0;
    cnt    <= 0;
    ack    <= 0;
    result <= 0;
  end else begin
    case(state)
      INIT         :begin
        state <= #1 WAIT_REQ;
      end
      WAIT_REQ     :begin
        if( req) begin
          state  <= #1 CALC;
          n_reg  <= #1 n;
          n_m1   <= #1 1;
          n_m2   <= #1 0;
          cnt    <= #1 0;
          ack    <= #1 0;
          result <= #1 0;
        end
      end
      CALC         :begin
        if(cnt == (n_reg-1)) begin
          state  <= #1 WAIT_REQ_FALL;
          result <= #1 n_m1;
        end else begin
          n_m1 <= #1 n_m1 + n_m2;
          n_m2 <= #1 n_m1;
          cnt  <= #1 cnt + 1;
        end
      end
      WAIT_REQ_FALL:begin
        if(~req)
          state <= #1 WAIT_REQ;
        ack <= #1 1;
      end
      default      :begin
        state <= 2'bxx;
      end
    endcase
  end
end

endmodule
`default_nettype wire
