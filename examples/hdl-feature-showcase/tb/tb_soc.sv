module tb_soc;
  logic clk;
  logic rst_n;
  logic uart_rx;
  logic uart_tx;
  logic [1:0] build_mode;

  soc_top u_dut (
    .clk        (clk),
    .rst_n      (rst_n),
    .uart_rx    (uart_rx),
    .uart_tx    (uart_tx),
    .build_mode (build_mode)
  );

  initial begin
    clk = 1'b0;
    forever #5 clk = ~clk;
  end

  initial begin
    rst_n   = 1'b0;
    uart_rx = 1'b1;
    #20 rst_n = 1'b1;
    #100 $finish;
  end
endmodule
