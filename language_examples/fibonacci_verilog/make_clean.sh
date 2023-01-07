#!/bin/bash

rm -rf fpga/*/db
rm -rf fpga/*/greybox_tmp
rm -rf fpga/*/incremental_db
rm -rf fpga/*/output_files
rm -rf fpga/*/simulation
rm -f  fpga/*/*.qws
rm -f  fpga/*/*.txt

rm -f testbench/*.vcd
rm -f testbench/*.out
