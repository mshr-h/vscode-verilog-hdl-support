module reset_sync (
  input  logic clk,
  input  logic rst_n_async,
  output logic rst_n
);
  logic rst_meta;

  always_ff @(posedge clk or negedge rst_n_async) begin
    if (!rst_n_async) begin
      rst_meta <= 1'b0;
      rst_n    <= 1'b0;
    end else begin
      rst_meta <= 1'b1;
      rst_n    <= rst_meta;
    end
  end
endmodule
