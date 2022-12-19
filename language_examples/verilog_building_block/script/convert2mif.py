#!python
#-*- encoding:utf-8 -*-

import sys
import os
import math

out_template = """-- Quartus II generated Memory Initialization File (.mif)

WIDTH=8;
DEPTH={0};

ADDRESS_RADIX=UNS;
DATA_RADIX=UNS;

CONTENT BEGIN
{1}
END;
"""

def read_file(filename):
    content = []
    for item in open(filename, "r"):
        line = item.rstrip()
        if line:
            content.append(int(line, 16))
    return content

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print "Usage: python {0} input.txt output.mif".format(sys.argv[0])
        exit(1)

    in_file  = os.path.abspath(sys.argv[1])
    out_file = os.path.abspath(sys.argv[2])
    content = read_file(in_file)
    address = 2**int(math.ceil(math.log(len(content), 2)))
    data = ""
    for word, i in zip(content, range(len(content))):
        data += "\t{0} : {1};\n".format(i, word)
    output = out_template.format(address, data)
    f = open(out_file, 'w')
    f.write(output)
    f.close()
