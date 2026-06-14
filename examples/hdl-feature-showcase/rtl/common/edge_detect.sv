module edge_detect (
  input  logic clk,
  input  logic rst_n,
  input  logic signal_i,
  output logic rising_edge
);
  logic signal_q;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      signal_q <= 1'b0;
    end else begin
      signal_q <= signal_i;
    end
  end

  assign rising_edge = signal_i & ~signal_q;
endmodule
