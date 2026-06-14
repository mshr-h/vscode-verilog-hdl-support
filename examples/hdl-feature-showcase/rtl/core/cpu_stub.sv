`include "config.svh"

import soc_types_pkg::*;

module cpu_stub (
  input  logic     clk,
  input  logic     rst_n,
  output bus_req_t bus_req,
  input  bus_rsp_t bus_rsp
);
  logic [3:0] counter;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      counter <= 4'h0;
    end else if (bus_rsp.ready) begin
      counter <= counter + 4'h1;
    end
  end

  assign bus_req.addr  = {{(`ADDR_WIDTH-4){1'b0}}, counter};
  assign bus_req.wdata = {{(`DATA_WIDTH-4){1'b0}}, counter};
  assign bus_req.write = 1'b0;
  assign bus_req.valid = 1'b1;
endmodule
