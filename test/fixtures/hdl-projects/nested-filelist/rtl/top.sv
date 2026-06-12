`include "defs.svh"

module nested_top(input logic clk);
  nested_foo u_foo(.clk(clk));
endmodule
