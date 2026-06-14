`include "config.svh"

package soc_types_pkg;
  typedef struct packed {
    logic [`ADDR_WIDTH-1:0] addr;
    logic [`DATA_WIDTH-1:0] wdata;
    logic                  write;
    logic                  valid;
  } bus_req_t;

  typedef struct packed {
    logic [`DATA_WIDTH-1:0] rdata;
    logic                  ready;
  } bus_rsp_t;
endpackage
