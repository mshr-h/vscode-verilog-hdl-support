module module_1();

localparam logic [2:0] Foo = 4'b0;

logic[1:0] max;
logic[7:0] cnt;

// multi-dimentional array
logic [3:0][1:0][7:0] mem [255:0] ;

// enum
typedef enum reg {Red, Green, Yellow} color;

endmodule