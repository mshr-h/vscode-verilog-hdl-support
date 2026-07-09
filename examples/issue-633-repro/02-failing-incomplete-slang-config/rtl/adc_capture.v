module adc_capture (
    input  wire       clk,
    input  wire       rst_n,
    input  wire [7:0] adc_data,
    output reg [11:0] sample_out,
    output reg        sample_valid
);

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            sample_out <= 12'h000;
            sample_valid <= 1'b0;
        end else begin
            sample_out <= {4'b0000, adc_data};
            sample_valid <= 1'b1;
        end
    end

endmodule