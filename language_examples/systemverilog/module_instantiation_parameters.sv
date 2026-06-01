module top;
  my_module #(
      .WIDTH(WIDTH)
  )
  u_my_module_same_line (
      .clk(clk)
  );

  my_module
  #(
      .WIDTH(WIDTH)
  )
  u_my_module_split_line
  (
      .clk(clk)
  );

  my_module u_my_module_no_parameters (
      .clk(clk)
  );
endmodule
