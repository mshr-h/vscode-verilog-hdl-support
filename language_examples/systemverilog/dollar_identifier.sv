module top$mod (
  input  wire w$some_net$b,
  output wire r$some_reg$d
);

reg r$display$d;

assign r$some_reg$d = w$some_net$b;

sub$mod u$sub$0 (
  .in$port(w$some_net$b),
  .out$port(r$some_reg$d)
);

initial begin
  $display("ok");
  r$display$d = w$some_net$b;
end

endmodule

module sub$mod (
  input  wire in$port,
  output wire out$port
);
endmodule
