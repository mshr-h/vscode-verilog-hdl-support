module fpga_top
(
  input  wire       RSTN,
  input  wire       clk_sys,
  input  wire       clk,
  input  wire       SW4N,
  input  wire       SW5N,
  output wire [7:0] SEG_A,
  output wire [7:0] SEG_B,
  output wire [7:0] SEG_C,
  output wire [7:0] SEG_D,
  output wire [7:0] SEG_E,
  output wire [7:0] SEG_F,
  output wire [7:0] SEG_G,
  output wire [7:0] SEG_H,
  output wire [8:0] SEG_SEL_IK
);

parameter
  N_IN  = 7,
  N_OUT = 90;

reg              req;
reg  [N_IN-1:0]  n;
wire             ack;
wire [N_OUT-1:0] result;

// detect falling edge
reg [1:0] ff_sw4 = 0;
reg [1:0] ff_sw5 = 0;
always @(posedge clk) begin
  ff_sw4 <= {ff_sw4[0], SW4N};
  ff_sw5 <= {ff_sw5[0], SW5N};
end
wire tri_sw4 = (ff_sw4 == 2'b10);
wire tri_sw5 = (ff_sw5 == 2'b10);

always @(posedge clk or negedge RSTN) begin
  if(~RSTN)
    req <= 0;
  else if(tri_sw4) begin
    req <= 1;
    n <= 60;
  end
  else if(tri_sw5)
    req <= 0;
end

fib
#(
  .N_IN  ( N_IN  ) ,
  .N_OUT ( N_OUT )
) fib_1
(
  .rst_n  ( RSTN   ) ,
  .clk    ( clk    ) ,
  .req    ( req    ) ,
  .n      ( n      ) ,
  .ack    ( ack    ) ,
  .result ( result )
);

/* 7SEG LED
+--------+--------+--------+--------+
| data0  | data1  | data2  | data3  |
+--------+--------+--------+--------+
| data4  | data5  | data6  | data7  |
+--------+--------+--------+--------+
| data8  | data9  | data10 | data11 |
+--------+--------+--------+--------+
| data12 | data13 | data14 | data15 |
+--------+--------+--------+--------+
*/

displayIK_7seg_16
_displayIK_7seg_16
(
  .RSTN    ( RSTN       ),
  .CLK     ( clk_sys    ),
  .data0   ( {3'h0,  clk, 3'h0, RSTN, 8'h00} ),
  .data1   ( {3'h0, SW4N, 3'h0, SW5N, 3'h0, req, 3'h0, ack} ),
  .data2   ( 0             ) ,
  .data3   ( n             ) ,
  .data4   ( result[89:64] ) ,
  .data5   ( result[63:48] ) ,
  .data6   ( result[47:32] ) ,
  .data7   ( result[31:16] ) ,
  .data8   ( result[15: 0] ) ,
  .data9   ( 0             ) ,
  .data10  ( 0             ) ,
  .data11  ( 0             ) ,
  .data12  ( 0             ) ,
  .data13  ( 0             ) ,
  .data14  ( 0             ) ,
  .data15  ( 0             ) ,
  .SEG_A   ( SEG_A         ) ,
  .SEG_B   ( SEG_B         ) ,
  .SEG_C   ( SEG_C         ) ,
  .SEG_D   ( SEG_D         ) ,
  .SEG_E   ( SEG_E         ) ,
  .SEG_F   ( SEG_F         ) ,
  .SEG_G   ( SEG_G         ) ,
  .SEG_H   ( SEG_H         ) ,
  .SEG_SEL ( SEG_SEL_IK    )
);

endmodule
