`default_nettype none
module displayIK_7seg_16
(
  input  wire        CLK,
  input  wire        RSTN,
  input  wire [15:0] data0,
  input  wire [15:0] data1,
  input  wire [15:0] data2,
  input  wire [15:0] data3,
  input  wire [15:0] data4,
  input  wire [15:0] data5,
  input  wire [15:0] data6,
  input  wire [15:0] data7,
  input  wire [15:0] data8,
  input  wire [15:0] data9,
  input  wire [15:0] data10,
  input  wire [15:0] data11,
  input  wire [15:0] data12,
  input  wire [15:0] data13,
  input  wire [15:0] data14,
  input  wire [15:0] data15,
  output wire [7:0]  SEG_A,
  output wire [7:0]  SEG_B,
  output wire [7:0]  SEG_C,
  output wire [7:0]  SEG_D,
  output wire [7:0]  SEG_E,
  output wire [7:0]  SEG_F,
  output wire [7:0]  SEG_G,
  output wire [7:0]  SEG_H,
  output wire [8:0]  SEG_SEL
);

wire [31:0] SEG_0,SEG_1,SEG_2,SEG_3,SEG_4,SEG_5,SEG_6,SEG_7;
wire [31:0] SEG_8,SEG_9,SEG_10,SEG_11,SEG_12,SEG_13,SEG_14,SEG_15;

display_module_async_16b
i0
(
  .data   (data0),
  .SEG_32 (SEG_0)
);
display_module_async_16b
i1
(
  .data   (data1),
  .SEG_32 (SEG_1)
);
display_module_async_16b
i2
(
  .data   (data2),
  .SEG_32 (SEG_2)
);
display_module_async_16b
i3
(
  .data   (data3),
  .SEG_32 (SEG_3)
);
display_module_async_16b
i4
(
  .data   (data4),
  .SEG_32 (SEG_4)
);
display_module_async_16b
i5
(
  .data   (data5),
  .SEG_32 (SEG_5)
);
display_module_async_16b
i6
(
  .data   (data6),
  .SEG_32 (SEG_6)
);
display_module_async_16b
i7
(
  .data   (data7),
  .SEG_32 (SEG_7)
);
display_module_async_16b
i8
(
  .data   (data8),
  .SEG_32 (SEG_8)
);
display_module_async_16b
i9
(
  .data   (data9),
  .SEG_32 (SEG_9)
);
display_module_async_16b
i10
(
  .data   (data10),
  .SEG_32 (SEG_10)
);
display_module_async_16b
i11
(
  .data   (data11),
  .SEG_32 (SEG_11)
);
display_module_async_16b
i12
(
  .data   (data12),
  .SEG_32 (SEG_12)
);
display_module_async_16b
i13
(
  .data   (data13),
  .SEG_32 (SEG_13)
);
display_module_async_16b
i14
(
  .data   (data14),
  .SEG_32 (SEG_14)
);
display_module_async_16b
i15
(
  .data   (data15),
  .SEG_32 (SEG_15)
);
dynamic_displayIK_16
i16
(
  .CLK     (CLK),
  .RST     (RSTN),
  .SEG_0   (SEG_0),
  .SEG_1   (SEG_1),
  .SEG_2   (SEG_2),
  .SEG_3   (SEG_3),
  .SEG_4   (SEG_4),
  .SEG_5   (SEG_5),
  .SEG_6   (SEG_6),
  .SEG_7   (SEG_7),
  .SEG_8   (SEG_8),
  .SEG_9   (SEG_9),
  .SEG_10  (SEG_10),
  .SEG_11  (SEG_11),
  .SEG_12  (SEG_12),
  .SEG_13  (SEG_13),
  .SEG_14  (SEG_14),
  .SEG_15  (SEG_15),
  .SEG_A   (SEG_A),
  .SEG_B   (SEG_B),
  .SEG_C   (SEG_C),
  .SEG_D   (SEG_D),
  .SEG_E   (SEG_E),
  .SEG_F   (SEG_F),
  .SEG_G   (SEG_G),
  .SEG_H   (SEG_H),
  .SEG_SEL (SEG_SEL)
);

endmodule

module dynamic_displayIK_16
(
  input  wire        CLK,
  input  wire        RST,
  input  wire [31:0] SEG_0,
  input  wire [31:0] SEG_1,
  input  wire [31:0] SEG_2,
  input  wire [31:0] SEG_3,
  input  wire [31:0] SEG_4,
  input  wire [31:0] SEG_5,
  input  wire [31:0] SEG_6,
  input  wire [31:0] SEG_7,
  input  wire [31:0] SEG_8,
  input  wire [31:0] SEG_9,
  input  wire [31:0] SEG_10,
  input  wire [31:0] SEG_11,
  input  wire [31:0] SEG_12,
  input  wire [31:0] SEG_13,
  input  wire [31:0] SEG_14,
  input  wire [31:0] SEG_15,
  output reg  [7:0]  SEG_A,
  output reg  [7:0]  SEG_B,
  output reg  [7:0]  SEG_C,
  output reg  [7:0]  SEG_D,
  output reg  [7:0]  SEG_E,
  output reg  [7:0]  SEG_F,
  output reg  [7:0]  SEG_G,
  output reg  [7:0]  SEG_H,
  output reg  [8:0]  SEG_SEL
);

localparam DEF_MAX = 16'h7FFF;
localparam COUNT_MAX = 3'b111;

reg [2:0]  COUNTER;
reg [15:0] DEF_COUNTER;

always @(posedge CLK or negedge RST) begin
  if(!RST) begin
    SEG_A <= 8'hFC;
    SEG_B <= 8'hFC;
    SEG_C <= 8'hFC;
    SEG_D <= 8'hFC;
    SEG_E <= 8'hFC;
    SEG_F <= 8'hFC;
    SEG_G <= 8'hFC;
    SEG_H <= 8'hFC;
    SEG_SEL <=9'h1FF;
    COUNTER <= 3'h0;
    DEF_COUNTER <= 16'h0000;
  end else begin
    if(DEF_COUNTER != DEF_MAX) begin
      DEF_COUNTER <= DEF_COUNTER + 16'd1;
      SEG_SEL <=9'h000;
    end
    else begin
      DEF_COUNTER <= 16'h0000;
      case(COUNTER)
        3'd0: begin
          SEG_A <= SEG_0[31:24];
          SEG_B <= SEG_0[23:16];
          SEG_C <= SEG_0[15:8];
          SEG_D <= SEG_0[7:0];
          SEG_E <= SEG_1[31:24];
          SEG_F <= SEG_1[23:16];
          SEG_G <= SEG_1[15:8];
          SEG_H <= SEG_1[7:0];
          SEG_SEL <= 9'b0_0000_0001;
        end
        3'd1: begin
          SEG_A <= SEG_2[31:24];
          SEG_B <= SEG_2[23:16];
          SEG_C <= SEG_2[15:8];
          SEG_D <= SEG_2[7:0];
          SEG_E <= SEG_3[31:24];
          SEG_F <= SEG_3[23:16];
          SEG_G <= SEG_3[15:8];
          SEG_H <= SEG_3[7:0];
          SEG_SEL <= 9'b0_0000_0010;
        end
        3'd2: begin
          SEG_A <= SEG_4[31:24];
          SEG_B <= SEG_4[23:16];
          SEG_C <= SEG_4[15:8];
          SEG_D <= SEG_4[7:0];
          SEG_E <= SEG_5[31:24];
          SEG_F <= SEG_5[23:16];
          SEG_G <= SEG_5[15:8];
          SEG_H <= SEG_5[7:0];
          SEG_SEL <= 9'b0_0000_0100;
        end
        3'd3: begin
          SEG_A <= SEG_6[31:24];
          SEG_B <= SEG_6[23:16];
          SEG_C <= SEG_6[15:8];
          SEG_D <= SEG_6[7:0];
          SEG_E <= SEG_7[31:24];
          SEG_F <= SEG_7[23:16];
          SEG_G <= SEG_7[15:8];
          SEG_H <= SEG_7[7:0];
          SEG_SEL <= 9'b0_0000_1000;
        end
        3'd4: begin
          SEG_A <= SEG_8[31:24];
          SEG_B <= SEG_8[23:16];
          SEG_C <= SEG_8[15:8];
          SEG_D <= SEG_8[7:0];
          SEG_E <= SEG_9[31:24];
          SEG_F <= SEG_9[23:16];
          SEG_G <= SEG_9[15:8];
          SEG_H <= SEG_9[7:0];
          SEG_SEL <= 9'b0_0001_0000;
        end
        3'd5: begin
          SEG_A <= SEG_10[31:24];
          SEG_B <= SEG_10[23:16];
          SEG_C <= SEG_10[15:8];
          SEG_D <= SEG_10[7:0];
          SEG_E <= SEG_11[31:24];
          SEG_F <= SEG_11[23:16];
          SEG_G <= SEG_11[15:8];
          SEG_H <= SEG_11[7:0];
          SEG_SEL <= 9'b0_0010_0000;
        end
        3'd6: begin
          SEG_A <= SEG_12[31:24];
          SEG_B <= SEG_12[23:16];
          SEG_C <= SEG_12[15:8];
          SEG_D <= SEG_12[7:0];
          SEG_E <= SEG_13[31:24];
          SEG_F <= SEG_13[23:16];
          SEG_G <= SEG_13[15:8];
          SEG_H <= SEG_13[7:0];
          SEG_SEL <= 9'b0_0100_0000;
        end
        3'd7: begin
          SEG_A <= SEG_14[31:24];
          SEG_B <= SEG_14[23:16];
          SEG_C <= SEG_14[15:8];
          SEG_D <= SEG_14[7:0];
          SEG_E <= SEG_15[31:24];
          SEG_F <= SEG_15[23:16];
          SEG_G <= SEG_15[15:8];
          SEG_H <= SEG_15[7:0];
          SEG_SEL <= 9'b0_1000_0000;
        end
      endcase
      if(COUNTER == COUNT_MAX) begin
        COUNTER <= 3'd0;
      end else begin
        COUNTER <= COUNTER + 3'd1;
      end
    end
  end
end
endmodule

module display_module_async_16b
(
  input  wire [15:0] data,
  output wire [31:0] SEG_32
);

display_module_async
i0
(
  .SEG_VAL (data[3:0]),
  .SEG     (SEG_32[7:0])
);
display_module_async
i1
(
  .SEG_VAL (data[7:4]),
  .SEG     (SEG_32[15:8])
);
display_module_async
i2
(
  .SEG_VAL (data[11:8]),
  .SEG     (SEG_32[23:16])
);
display_module_async
i3
(
  .SEG_VAL (data[15:12]),
  .SEG     (SEG_32[31:24])
);

endmodule

module display_module_async
(
  input  wire [3:0] SEG_VAL,
  output reg  [7:0] SEG
);

always @ (*) begin
  case (SEG_VAL)
    4'h0: SEG <= 8'b11111100;
    4'h1: SEG <= 8'b01100000;
    4'h2: SEG <= 8'b11011010;
    4'h3: SEG <= 8'b11110010;
    4'h4: SEG <= 8'b01100110;
    4'h5: SEG <= 8'b10110110;
    4'h6: SEG <= 8'b10111110;
    4'h7: SEG <= 8'b11100000;
    4'h8: SEG <= 8'b11111110;
    4'h9: SEG <= 8'b11110110;
    4'ha: SEG <= 8'b11101110;
    4'hb: SEG <= 8'b00111110;
    4'hc: SEG <= 8'b00011010;
    4'hd: SEG <= 8'b01111010;
    4'he: SEG <= 8'b10011110;
    4'hf: SEG <= 8'b10001110;
  endcase
end
endmodule
`default_nettype wire
