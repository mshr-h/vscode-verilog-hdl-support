module t;
  typedef enum logic [1:0] {
    INIT,
    END,
    BEGIN
  } fsm_t;

  fsm_t fsm;

  initial begin
    case (fsm)
      INIT:  begin end
      END:   begin end
      BEGIN: begin end
    endcase
  end
endmodule
