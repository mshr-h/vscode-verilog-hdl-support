`default_nettype none

module uart_rx
(
  input  wire       clk, // 9600hz
  input  wire       rst_n,
  input  wire       rx_in,
  output reg  [7:0] rx_data,
  output reg        rx_rdy
);

localparam IDLE  = 0;
localparam BIT_0 = 1;
localparam BIT_1 = 2;
localparam BIT_2 = 3;
localparam BIT_3 = 4;
localparam BIT_4 = 5;
localparam BIT_5 = 6;
localparam BIT_6 = 7;
localparam BIT_7 = 8;
localparam READY = 9;

reg [3:0] state;

always @(posedge clk or negedge rst_n) begin
  if (~rst_n) begin
    state <= IDLE;
    rx_data <= 0;
    rx_rdy <= 0;
  end
  else begin
    case (state)
      IDLE: begin
        rx_rdy <= 0;
        if (rx_in == 1'b0)
          state <= BIT_0;
      end
      BIT_0: begin
        rx_data[0] <= rx_in;
        state <= BIT_1;
      end
      BIT_1: begin
        rx_data[1] <= rx_in;
        state <= BIT_2;
      end
      BIT_2: begin
        rx_data[2] <= rx_in;
        state <= BIT_3;
      end
      BIT_3: begin
        rx_data[3] <= rx_in;
        state <= BIT_4;
      end
      BIT_4: begin
        rx_data[4] <= rx_in;
        state <= BIT_5;
      end
      BIT_5: begin
        rx_data[5] <= rx_in;
        state <= BIT_6;
      end
      BIT_6: begin
        rx_data[6] <= rx_in;
        state <= BIT_7;
      end
      BIT_7: begin
        rx_data[7] <= rx_in;
        state <= READY;
      end
      READY: begin
        rx_rdy <= 1;
        state <= IDLE;
      end
      default:
        state <= IDLE;
    endcase
  end
end

endmodule

`default_nettype wire

