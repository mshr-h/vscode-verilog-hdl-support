module timer_core #(
  parameter int WIDTH = 32
) (
  input  logic clk,
  input  logic rst_n,
  output logic tick
);
  logic [WIDTH-1:0] count;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      count <= '0;
    end else begin
      count <= count + {{(WIDTH-1){1'b0}}, 1'b1};
    end
  end

  assign tick = &count;
endmodule
