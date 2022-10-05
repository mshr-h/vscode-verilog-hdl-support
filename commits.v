module encoder8_3(Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, A0, A1, A2,);
  input Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7;
  output reg A0, A1, A2;
  always @(*) begin
    A0 = Y1 | Y3 | Y5 | Y7;
    A1 = Y2 | Y3 | Y6 | Y7;
    A2 = Y4 | Y5 | Y6 | Y7;
end
endmodule

module decoder3_8(Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, A2, A1, A0);
  output reg Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7;
  input A2, A1, A0;
  always @(*) begin
    Y0 = ~A2 & ~A1 & ~A0;
    Y1 = ~A2 & ~A1 & A0;
    Y2 = ~A2 & A1 & ~A0;
    Y3 = ~A2 & A1 & A0;
    Y4 = A2 & ~A1 & ~A0;
    Y5 = A2 & ~A1 & A0;
    Y6 = A2 & A1 & ~A0;
    Y7 = A2 & A1 & A0;
end
endmodule

module mux8_1(Y, A0, A1, A2, A3, A4, A5, A6, A7, S0, S1, S2);
  output reg Y;
  input A0, A1, A2, A3, A4, A5, A6, A7, S0, S1, S2;
  always @(*) begin
    case({S2, S1, S0})
      3'b000: Y = A0;
      3'b001: Y = A1;
      3'b010: Y = A2;
      3'b011: Y = A3;
      3'b100: Y = A4;
      3'b101: Y = A5;
      3'b110: Y = A6;
      3'b111: Y = A7;
    endcase
  end
endmodule

module demux1_8(A, Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, S0, S1, S2);
  input A, S0, S1, S2;
  output reg Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7;
  always @(*) begin
    Y0 = A & ~S2 & ~S1 & ~S0;
    Y1 = A & ~S2 & ~S1 & S0;
    Y2 = A & ~S2 & S1 & ~S0;
    Y3 = A & ~S2 & S1 & S0;
    Y4 = A & S2 & ~S1 & ~S0;
    Y5 = A & S2 & ~S1 & S0;
    Y6 = A & S2 & S1 & ~S0;
    Y7 = A & S2 & S1 & S0;
  end
endmodule

module mux4_1(Y, A0, A1, A2, A3, S0, S1);
  output reg Y;
  input A0, A1, A2, A3, S0, S1;
  always @(*) begin
    case({S0, S1})
      2'b00: Y = A0;
      2'b01: Y = A1;
      2'b10: Y = A2;
      2'b11: Y = A3;
    endcase
  end
endmodule

module mux_1257(Y, x, y, z);
  output wire Y;
  input x, y, z;
  mux4_1 f(Y, z, ~z, z, z, x, y);
endmodule

module parity_bit_generator(Y, A, B, C);
  output reg Y;
  input A, B, C;
  always @(*) begin
    Y = A^B^C;
  end
endmodule

module parity_checker(Y, A, B, C, P);
  output reg Y;
  input A, B, C, P;
  always @(*) begin
    Y = A^B^C^P;
  end
endmodule

module full_adder(carry_out, sum, A, B, carry_in);
  output reg carry_out, sum;
  input A, B, carry_in;
  always @(*) begin
    sum = A^B^carry_in;
    carry_out = ((A^B) & carry_in) || (A&B);
  end
endmodule

module four_bit_parallel_adder(output wire[3:0] sum, output wire carry_out, input [3:0] A, input [3:0] B);
  wire [2:0] carry;
  full_adder fa1(carry[0], sum[0], A[0], B[0], 1'b0);
  full_adder fa2(carry[1], sum[1], A[1], B[1], carry[0]);
  full_adder fa3(carry[2],sum[2], A[2], B[2], carry[1]);
  full_adder fa4(carry_out, sum[3], A[3], B[3], carry[2]);
endmodule

module unsigned_array_multiplier(Y, A, B);
  output reg [7:0] Y;
  input [3:0] A;
  input [3:0] B;
  wire carry_1, carry_2, carry_3;
  reg [3:0] p0;
  reg [3:0] p1;
  reg [3:0] p2;
  reg [3:0] p3;
  wire [3:0] s0;
  wire [3:0] s1;
  wire [3:0] s2;
  four_bit_parallel_adder fpa0(s0, carry_1, {1'b0, p0[3], p0[2], p0[1]}, p1);
  four_bit_parallel_adder fpa1(s1, carry_2, {carry_1, s0[3], s0[2], s0[1]}, p2);
  four_bit_parallel_adder fpa2(s2, carry_3, {carry_2, s1[3], s1[2], s1[1]}, p3);
  always @(A or B) begin
    p0 = B & {A[0], A[0], A[0], A[0]};
    p1 = B & {A[1], A[1], A[1], A[1]};
    p2 = B & {A[2], A[2], A[2], A[2]};
    p3 = B & {A[3], A[3], A[3], A[3]};
  end
  always @(*) begin
    Y = {carry_3, s2[3], s2[2], s2[1], s2[0], s1[0], s0[0], p0[0]};
  end
endmodule

