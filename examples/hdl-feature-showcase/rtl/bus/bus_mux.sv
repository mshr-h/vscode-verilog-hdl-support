import soc_types_pkg::*;

module bus_mux (
  input  bus_req_t cpu_req,
  output bus_rsp_t cpu_rsp,
  output bus_req_t ram_req,
  input  bus_rsp_t ram_rsp
);
  assign ram_req = cpu_req;
  assign cpu_rsp = ram_rsp;
endmodule
