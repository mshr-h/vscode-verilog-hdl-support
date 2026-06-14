module bad_instance_top (
  input  logic clk,
  input  logic rst_n,
  input  logic uart_rx,
  output logic uart_tx
);
  uart_core #(
    .BAUD_RATE (115200) // Intentional demo issue: uart_core has parameter BAUD, not BAUD_RATE.
  ) u_uart (
    .clk   (clk),
    .rst_n (rst_n),
    .rx_i  (uart_rx),   // Intentional demo issue: uart_core has port rx, not rx_i.
    .tx    (uart_tx)
  );

  missing_accelerator u_accel (); // Intentional demo issue: module is intentionally missing.
endmodule
