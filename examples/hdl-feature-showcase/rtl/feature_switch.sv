module feature_switch (
  output logic [1:0] build_mode
);
`ifdef FPGA
  assign build_mode = 2'b01;
`elsif SIMULATION
  assign build_mode = 2'b10;
`else
  assign build_mode = 2'b00;
`endif
endmodule
