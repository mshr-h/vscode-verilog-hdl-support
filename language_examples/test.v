`include "float_add.v"

module test (
);
float_add fa (
);

endmodule

// % iverilog -t null test.v                                     
// test.v:3: error: 'test' has already been declared in this scope.
// ./float_add.v:6:      : It was declared here as a module.
// test.v:8: error: Module test was already declared here: ./float_add.v:6