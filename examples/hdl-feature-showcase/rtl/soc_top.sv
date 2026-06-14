`include "config.svh"
`include "board_defs.svh"

import soc_types_pkg::*;

module soc_top (
  input  logic clk,
  input  logic rst_n,
  input  logic uart_rx,
  output logic uart_tx,
  output logic [1:0] build_mode
);
  bus_req_t cpu_req;
  bus_rsp_t cpu_rsp;
  bus_req_t ram_req;
  bus_rsp_t ram_rsp;
  logic timer_tick;
  logic rst_n_sync;

  reset_sync u_reset_sync (
    .clk         (clk),
    .rst_n_async (rst_n),
    .rst_n       (rst_n_sync)
  );

  cpu_stub u_cpu (
    .clk     (clk),
    .rst_n   (rst_n_sync),
    .bus_req (cpu_req),
    .bus_rsp (cpu_rsp)
  );

  bus_mux u_bus (
    .cpu_req (cpu_req),
    .cpu_rsp (cpu_rsp),
    .ram_req (ram_req),
    .ram_rsp (ram_rsp)
  );

  uart_core #(
    .BAUD (`UART_BAUD)
  ) u_uart (
    .clk   (clk),
    .rst_n (rst_n_sync),
    .rx    (uart_rx),
    .tx    (uart_tx)
  );

  timer_core #(
    .WIDTH (`DATA_WIDTH)
  ) u_timer (
    .clk   (clk),
    .rst_n (rst_n_sync),
    .tick  (timer_tick)
  );

  soc_ram u_ram (
    .clk   (clk),
    .addr  (ram_req.addr),
    .rdata (ram_rsp.rdata)
  );

  feature_switch u_feature_switch (
    .build_mode (build_mode)
  );

  edge_detect u_timer_edge (
    .clk         (clk),
    .rst_n       (rst_n_sync),
    .signal_i    (timer_tick),
    .rising_edge ()
  );

  gpio_core u_gpio (
    .clk   (clk),
    .rst_n (rst_n_sync)
  ); // Intentional demo issue: gpio_core is not provided by this sample.

  assign ram_rsp.ready = ram_req.valid;
endmodule
