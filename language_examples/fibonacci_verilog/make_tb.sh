#!/bin/bash

cd testbench/
TARGET=`ls -1 tb_*.v | sed -e 's/\(.*\)\.v/\1/g'`
for t in $TARGET
do
  iverilog -Wall -o $t.out $t.v
  vvp $t.out
done

