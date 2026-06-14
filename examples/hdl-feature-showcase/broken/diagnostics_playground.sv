`include "missing_header.svh" // Intentional demo issue: header is intentionally missing.

module diagnostics_playground (
  output logic x
);
  assign x = `MISSING_MACRO; // Intentional demo issue: macro is intentionally undefined.
endmodule
