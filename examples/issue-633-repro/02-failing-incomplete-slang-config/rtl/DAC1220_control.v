module DAC1220_control (
    input  wire        clk,
    input  wire        rst_n,
    input  wire [11:0] sample,
    input  wire        load,
    output wire        dac_sclk,
    output wire        dac_mosi,
    output wire        dac_cs_n
);

    reg [11:0] shift_reg;
    reg        busy;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            shift_reg <= 12'h000;
            busy <= 1'b0;
        end else if (load) begin
            shift_reg <= sample;
            busy <= 1'b1;
        end else begin
            busy <= 1'b0;
        end
    end

    assign dac_sclk = clk;
    assign dac_mosi = shift_reg[11];
    assign dac_cs_n = ~busy;

endmodule