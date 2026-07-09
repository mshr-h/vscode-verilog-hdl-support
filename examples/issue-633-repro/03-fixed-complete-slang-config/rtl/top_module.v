module top_module (
    input  wire        clk,
    input  wire        rst_n,
    input  wire [7:0]  adc_data,
    output wire        dac_sclk,
    output wire        dac_mosi,
    output wire        dac_cs_n
);

    wire [11:0] sample_data;
    wire        sample_valid;
    wire        force_update;

    adc_capture u_adc_capture (
        .clk(clk),
        .rst_n(rst_n),
        .adc_data(adc_data),
        .sample_out(sample_data),
        .sample_valid(sample_valid)
    );

    DAC1220_control u_dac1220_control (
        .clk(clk),
        .rst_n(rst_n),
        .sample(sample_data),
        .load(sample_valid | force_update),
        .dac_sclk(dac_sclk),
        .dac_mosi(dac_mosi),
        .dac_cs_n(dac_cs_n)
    );

    ila_0 u_ila_0 (
        .clk(clk),
        .probe0(sample_data),
        .probe1(sample_valid)
    );

    vio_0 u_vio_0 (
        .clk(clk),
        .probe_out0(force_update)
    );

endmodule