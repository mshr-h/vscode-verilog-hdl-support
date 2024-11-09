module test;

wire a, b;

property p;
  @(posedge clk) a |-> b;
endproperty
a: assert property(p);

property p;
  @(posedge clk) a |=> b;
endproperty
a: assert property(p);

endmodule
