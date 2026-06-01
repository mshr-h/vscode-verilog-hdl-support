module xadc(
    input i_clk_100m,
    input i_sig_p,
    input i_sig_n,
    input i_ref_p,
    input i_ref_n,
    input i_RESET
    );
endmodule

module port_declaration_examples(
    input wire i_clk,
    output reg [7:0] o_data,
    inout [3:0] bus
    );

    my_module u0 (
        .clk(i_clk)
    );

endmodule

module port_declaration_prefix_module(
    input wire i_clk
    );

    input_filter u0 (
        .clk(i_clk)
    );

endmodule
