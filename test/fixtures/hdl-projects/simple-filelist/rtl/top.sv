`include "defs.svh"

module top(input logic clk, output logic done);
  foo_core u_foo(.clk(clk), .done(done));
endmodule
