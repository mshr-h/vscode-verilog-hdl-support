// synopsys translate_off
`timescale 1 ps / 1 ps
// synopsys translate_on

module ram_sp
#(
  parameter DWIDTH=8,
  parameter AWIDTH=12,
  parameter CONTENT="./memory.mif"
) (
`ifndef ALTERA_RESERVED_QIS
// synopsys translate_off
`endif
  input  tri1               clock,
`ifndef ALTERA_RESERVED_QIS
// synopsys translate_on
`endif
  input  wire               wren,
  input  wire [AWIDTH-1:0]  address,
  input  wire [DWIDTH-1:0]  data,
  output wire [DWIDTH-1:0]  q
);

altsyncram altsyncram_component
(
  .address_a      ( address ),
  .clock0         ( clock   ),
  .data_a         ( data    ),
  .wren_a         ( wren    ),
  .q_a            ( q       ),
  .aclr0          ( 1'b0    ),
  .aclr1          ( 1'b0    ),
  .address_b      ( 1'b1    ),
  .addressstall_a ( 1'b0    ),
  .addressstall_b ( 1'b0    ),
  .byteena_a      ( 1'b1    ),
  .byteena_b      ( 1'b1    ),
  .clock1         ( 1'b1    ),
  .clocken0       ( 1'b1    ),
  .clocken1       ( 1'b1    ),
  .clocken2       ( 1'b1    ),
  .clocken3       ( 1'b1    ),
  .data_b         ( 1'b1    ),
  .rden_a         ( 1'b1    ),
  .rden_b         ( 1'b1    ),
  .wren_b         ( 1'b0    )
);

defparam
  altsyncram_component.clock_enable_input_a          = "BYPASS",
  altsyncram_component.clock_enable_output_a         = "BYPASS",
  altsyncram_component.init_file                     = CONTENT,
  altsyncram_component.intended_device_family        = "Cyclone IV E",
  altsyncram_component.lpm_hint                      = "ENABLE_RUNTIME_MOD=NO",
  altsyncram_component.lpm_type                      = "altsyncram",
  altsyncram_component.numwords_a                    = 2**AWIDTH,
  altsyncram_component.operation_mode                = "SINGLE_PORT",
  altsyncram_component.outdata_aclr_a                = "NONE",
  altsyncram_component.outdata_reg_a                 = "UNREGISTERED",
  altsyncram_component.power_up_uninitialized        = "FALSE",
  altsyncram_component.read_during_write_mode_port_a = "NEW_DATA_NO_NBE_READ",
  altsyncram_component.widthad_a                     = AWIDTH,
  altsyncram_component.width_a                       = DWIDTH,
  altsyncram_component.width_byteena_a               = 1;

endmodule

