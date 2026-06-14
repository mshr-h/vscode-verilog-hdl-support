module uart_core #(
  parameter int BAUD = 115200
) (
  input  logic clk,
  input  logic rst_n,
  input  logic rx,
  output logic tx
);
  logic rx_q;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      rx_q <= 1'b1;
    end else begin
      rx_q <= rx;
    end
  end

  assign tx = rx_q;
endmodule
