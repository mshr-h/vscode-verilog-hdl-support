`default_nettype none
module moduleName;

a_pri_0:    assert property (@(posedge clk) $onehot({pri_red_0, pri_yel_0, pri_grn_0}) );
a_pri_1:    assert property (@(posedge clk) $onehot({pri_red_1, pri_yel_1, pri_grn_1}) );

endmodule