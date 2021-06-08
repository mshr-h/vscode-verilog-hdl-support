import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import {bsvLexer} from "../src/bsvjs/bsvLexer"
import {bsvParser} from "../src/bsvjs/bsvParser"

import {SymbolInformation, TextDocument, Uri, window, workspace} from 'vscode';
import { DocumentSymbol } from 'vscode-languageclient';

export interface BsvInfoProvider{
    getSymbol(doc : TextDocument) : DocumentSymbol[] | SymbolInformation[];
}

const internalInfo = {
    /*
    missing:  
    ~|
    exp

    */

    /*
    "" : {
        "type" : "",
        "info" : ``,
        "proto" : ``,
         "super" : [
            
        ],
        "methods" : {
            "pack" : {
                "proto" : ``,
                "info"  : ``,
            },
            "unpack" : {
                "proto" : ``,
                "info"  : ``,
            },
        }
    },


    "" : {
        "type" : "module",
        "info" : ``,
        "proto" : ``
    },
    */
    "Bits" : {
        "type" : "typeclass",
        "info" : `Bits defines the class of types that can be converted to bit vectors and back. Membership in this
        class is required for a data type to be stored in a state, such as a Register or a FIFO, or to be used
        at a synthesized module boundary. Often instance of this class can be automatically derived using
        the deriving statement.`,
        "proto" : `Bits #(type a, numeric type n)`,
        "methods" : {
            "pack" : {
                "type"  : `function`,
                "proto" : `function Bit#(size_a) pack(data_t a);`,
                "info"  : `Converts element a of datatype data_t to a element of datatype Bit#() of size_a.`,
                "package" : "Prelude",
            },
            "unpack" : {
                "type"  : `function`,
                "proto" : `function data_t unpack(Bit#(size_a) a);`,
                "info"  : `Converts an element a of datatype Bit#() and size_a into an element with of element type data_t.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Eq" : {
        "type" : "typeclass",
        "info" : `Eq defines the class of types whose values can be compared for equality. Instances of the Eq class are often automatically derived using the deriving statement.`,
        "proto" : `Eq #(type data_t);`,
        "methods" : {
            "==" : {
                "type"  : `function`,
                "proto" : `function Bool \== (data_t x, data_t y,);`,
                "info"  : `Returns True if x is equal to y.`,
            },
            "/=" : {
                "type"  : `function`,
                "proto" : `function Bool \/= (data_t x, data_t y,);`,
                "info"  : `Returns True if x is not equal to y.`,
                "package" : "Prelude"
            },
        },
        "package" : "Prelude",
    },
    "Literal" : {
        "type" : "typeclass",
        "info" : `Literal defines the class of types which can be created from integer literals.`,
        "proto" : `Literal #(type data_t);`,
        "methods" : {
            "fromInteger" : {
                "type"  : `function`,
                "proto" : `function data_t fromInteger(Integer x);`,
                "info"  : `Converts an element x of datatype Integer into an element of data type data_t`,
                "package" : "Prelude",
            },
            "inLiteralRange" : {
                "type"  : `function`,
                "proto" : `function Bool inLiteralRange(data_t target, Integer x);`,
                "info"  : `Tests whether an element x of datatype Integer is in the legal range of data type data_t`,
            },
        },
        "package" : "Prelude",
    },
    "RealLiteral" : {
        "type" : "typeclass",
        "info" : `RealLiteral defines the class of types which can be created from real literals.`,
        "proto" : `RealLiteral #(type data_t);`,
        "methods" : {
            "fromReal" : {
                "type"  : `function`,
                "proto" : `function data_t fromReal(Real x);`,
                "info"  : `Converts an element x of datatype Real into an element of data type data_t`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "SizedLiteral" : {
        "type" : "typeclass",
        "info" : `SizedLiteral defines the class of types which can be created from integer literals with a specified size.`,
        "proto" : `SizedLiteral #(type data_t, type size_t)`,
        "methods" : {
            "fromSizedInteger" : {
                "type"  : `function`,
                "proto" : `function data_t fromSizedInteger(Bit#(size_t));`,
                "info"  : `Converts an element of Bit#(size_t) into an element of data type data_t`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Arith" : {
        "type" : "typeclass",
        "info" : `Arith defines the class of types on which arithmetic operations are dened.`,
        "proto" : `Arith #(type data_t)`,
        "methods" : {
            "+" : {
                "type"  : `function`,
                "proto" : `function data_t \+ (data_t x, data_t y);`,
                "info"  : `Element x is added to element y.`,
                "package" : "Prelude",
            },
            "-" : {
                "type"  : `function`,
                "proto" : `function data_t \- (data_t x, data_t y);`,
                "info"  : `Element y is subtracted from element x.`,
                "package" : "Prelude",
            },
            "negate" : {
                "type"  : `function`,
                "proto" : `function data_t negate (data_t x);`,
                "info"  : `Change the sign of the number. When using the function the Verilog negate operator, -, may be used.`,
                "package" : "Prelude",
            },
            "*" : {
                "type"  : `function`,
                "proto" : `function data_t \* (data_t x, data_t y);`,
                "info"  : `Element x is multiplied by y.`,
                "package" : "Prelude",
            },
            "/" : {
                "type"  : `function`,
                "proto" : `function data_t \/ (data_t x, data_t y);`,
                "info"  : `Element x is divided by y. The definition depends on the type - many types truncate the remainder . Note: may not be synthesizable with downstream tools.`,
                "package" : "Prelude",
            },
            "%" : {
                "type"  : `function`,
                "proto" : `function data_t \% (data_t x, data_t y);`,
                "info"  : `Returns the remainder of x=y. Obeys the identity ((x=y) * y) +(x%y) = x.`,
                "package" : "Prelude",
            },
            "abs" : {
                "type"  : `function`,
                "proto" : `function data_t abs (data_t x);`,
                "info"  : `Returns the absolute value of x.`,
                "package" : "Prelude",
            },
            "signum" : {
                "type"  : `function`,
                "proto" : `function data_t signum (data_t x);`,
                "info"  : `Returns a unit value with the same sign as x, such that abs(x)*signum(x) = x. signum(12) returns 1 and signum(-12) returns -1.`,
                "package" : "Prelude",
            },
            "**" : {
                "type"  : `function`,
                "proto" : `function data_t \** (data_t x, data_t y);`,
                "info"  : `The element x is raised to the y power (x**y = x^y).`,
                "package" : "Prelude",
            },
            "log2" : {
                "type"  : `function`,
                "proto" : `function data_t log2(data_t x) ;`,
                "info"  : `Returns the base 2 logarithm of x (log 2x).`,
                "package" : "Prelude",
            },
            "exp_e" : {
                "type"  : `function`,
                "proto" : `function data_t exp_e (data_t x);`,
                "info"  : `e is raised to the power of x (ex).`,
                "package" : "Prelude",
            },
            "log" : {
                "type"  : `function`,
                "proto" : `function data_t log (data_t x);`,
                "info"  : `Returns the base e logarithm of x (log ex).`,
            },
            "logb" : {
                "type"  : `function`,
                "proto" : `function data_t logb (data_t b, data_t x);`,
                "info"  : `Returns the base b logarithm of x (log bx).`,
                "package" : "Prelude",
            },
            "log10" : {
                "type"  : `function`,
                "proto" : `function data_t log10(data_t x) ;`,
                "info"  : `Returns the base 10 logarithm of x (log 10x).`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Ord" : {
        "type" : "typeclass",
        "info" : `Ord defines the class of types for which an order is defined, allowing comparison operations. A complete definition of an instance of Ord requires dening either <= or compare.`,
        "proto" : `Ord #(type data_t);`,
        "methods" : {
            "<" : {
                "type"  : `function`,
                "proto" : `function Bool \< (data_t x, data_t y);`,
                "info"  : `Returns True if x is less than y.`,
                "package" : "Prelude",
            },
            "<=" : {
                "type"  : `function`,
                "proto" : `function Bool \<= (data_t x, data_t y);`,
                "info"  : `Returns True if x is less than or equal to y.`,
                "package" : "Prelude",
            },
            ">" : {
                "type"  : `function`,
                "proto" : `function Bool \> (data_t x, data_t y);`,
                "info"  : `Returns True if x is greater than y.`,
                "package" : "Prelude",
            },
            ">=" : {
                "type"  : `function`,
                "proto" : `function Bool \>= (data_t x, data_t y);`,
                "info"  : `Returns True if x is greater than or equal to y.`,
                "package" : "Prelude",
            },
            "compare" : {
                "type"  : `function`,
                "proto" : `function Ordering compare (data_t x, data_t y);`,
                "info"  : `Returns the Ordering value describing the relationship of x to y.`,
                "package" : "Prelude",
            },
            "min" : {
                "type"  : `function`,
                "proto" : `function data_t min (data_t x, data_t y);`,
                "info"  : `Returns the minimum of the values x and y.`,
                "package" : "Prelude",
            },
            "max" : {
                "type"  : `function`,
                "proto" : `function data_t max (data_t x, data_t y);`,
                "info"  : `Returns the maximum of the values x and y.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Bounded" : {
        "type" : "typeclass",
        "info" : `Bounded defines the class of types with a finite range and provides functions to define the range.`,
        "proto" : `Bounded #(type data_t);`,
        "methods" : {
            "minBound" : {
                "type"  : `function`,
                "proto" : `data_t minBound;`,
                "info"  : `The minimum value the type data_t can have.`,
                "package" : "Prelude",
            },
            "maxBound" : {
                "type"  : `function`,
                "proto" : `data_t maxBound;`,
                "info"  : `The maximum value the type data_t can have.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Bitwise" : {
        "type" : "typeclass",
        "info" : `Bitwise defines the class of types on which bitwise operations are defined.`,
        "proto" : `Bitwise #(type data_t);`,
        "methods" : {
            "&" : {
                "type"  : `function`,
                "proto" : `function data_t \& (data_t x1, data_t x2);`,
                "info"  : `Performs an and operation on each bit in x1 and x2 to calculate the result.`,
                "package" : "Prelude",
            },
            "|" : {
                "type"  : `function`,
                "proto" : `function data_t \| (data_t x1, data_t x2);`,
                "info"  : `Performs an or operation on each bit in x1 and x2 to calculate the result.`,
                "package" : "Prelude",
            },
            "^" : {
                "type"  : `function`,
                "proto" : `function data_t \^ (data_t x1, data_t x2);`,
                "info"  : `Performs an exclusive or operation on each bit in x1 and x2 to calculate the result.`,
                "package" : "Prelude",
            },
            "~^" : {
                "type"  : `function`,
                "proto" : `function data_t \~^ (data_t x1, data_t x2);`,
                "info"  : `Performs an exclusive nor operation on each bit in x1 and x2 to calculate the result.`,
                "package" : "Prelude",
            },
            "^~" : {
                "type"  : `function`,
                "proto" : `function data_t \^~ (data_t x1, data_t x2);`,
                "info"  : `Performs an exclusive nor operation on each bit in x1 and x2 to calculate the result.`,
                "package" : "Prelude",
            },
            "invert" : {
                "type"  : `function`,
                "proto" : `function data_t invert (data_t x1);`,
                "info"  : `Performs a unary negation operation on each bit in x1. When using this function, the corresponding Verilog operator, ~, may be used.`,
                "package" : "Prelude",
            },
            "~" : {
                "type"  : `function`,
                "proto" : `function data_t invert (data_t x1);`,
                "info"  : `Performs a unary negation operation on each bit in x1. When using this function, the corresponding Verilog operator, ~, may be used.`,
                "package" : "Prelude",
            },
            "<<" : {
                "type"  : `function`,
                "proto" : `function data_t \<< (data_t x1, x2);`,
                "info"  : `Performs a left shift operation of x1 by the number of bit positions given by x2. x2 must be of an acceptable index type (Integer, Bit#(n), Int#(n) or UInt#(n)).`,
                "package" : "Prelude",
            },
            ">>" : {
                "type"  : `function`,
                "proto" : `function data_t \>> (data_t x1, x2);`,
                "info"  : `Performs a right shift operation of x1 by the number of bit positions given by x2. x2 must be of an acceptable index type (Integer, Bit#(n), Int#(n) or UInt#(n)).`,
                "package" : "Prelude",
            },
            "msb" : {
                "type"  : `function`,
                "proto" : `function Bit#(1) msb (data_t x);`,
                "info"  : `Returns the value of the most significant bit of x. Returns 0 if width of data t is 0.`,
                "package" : "Prelude",
            },
            "lsb" : {
                "type"  : `function`,
                "proto" : `function Bit#(1) lsb (data_t x);`,
                "info"  : `Returns the value of the least significant bit of x. Returns 0 if width of data t is 0.`,
                "package" : "Prelude",
            }
        },
        "package" : "Prelude",
    },
    "BitReduction" : {
        "type" : "typeclass",
        "info" : `BitReduction defines the class of types on which the Verilog bit reduction operations are defined.`,
        "proto" : `BitReduction #(type x, numeric type n)`,
        "methods" : {
            "reduceAnd" : {
                "type"  : `function`,
                "proto" : `function x#(1) reduceAnd (x#(n) d);`,
                "info"  : `Performs an and bit reduction operation between the elements of d to calculate the result.`,
                "package" : "Prelude",
            },
            "reduceOr" : {
                "type"  : `function`,
                "proto" : `function x#(1) reduceOr (x#(n) d);`,
                "info"  : `Performs an or bit reduction operation between the elements of d to calculate the result.`,
                "package" : "Prelude",
            },
            "reduceXor" : {
                "type"  : `function`,
                "proto" : `function x#(1) reduceXor (x#(n) d);`,
                "info"  : `Performs an xor bit reduction operation between the elements of d to calculate the result.`,
            },
            "reduceNand" : {
                "type"  : `function`,
                "proto" : `function x#(1) reduceNand (x#(n) d);`,
                "info"  : `Performs an nand bit reduction operation between the elements of d to calculate the result.`,
                "package" : "Prelude",
            },
            "reduceNor" : {
                "type"  : `function`,
                "proto" : `function x#(1) reduceNor (x#(n) d);`,
                "info"  : `Performs an nor bit reduction operation between the elements of d to calculate the result.`,
                "package" : "Prelude",
            },
            "reduceXnor" : {
                "type"  : `function`,
                "proto" : `function x#(1) reduceXnor (x#(n) d);`,
                "info"  : `Performs an xnor bit reduction operation between the elements of d to calculate the result.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "BitExtend" : {
        "type" : "typeclass",
        "info" : `BitExtend defines types on which bit extension operations are defined.`,
        "proto" : `BitExtend #(numeric type m, numeric type n, type x);`,
        "methods" : {
            "extend" : {
                "type"  : `function`,
                "proto" : `function x#(n) extend (x#(m) d) provisos (Add#(k, m, n));`,
                "info"  : `Performs either a zeroExtend or a signExtend as appropriate, depending on the data type of the argument (zeroExtend for an unsigned argument, signExtend for a signed argument).`,
                "package" : "Prelude",
            },
            "zeroExtend" : {
                "type"  : `function`,
                "proto" : `function x#(n) zeroExtend (x#(m) d) provisos (Add#(k, m, n));`,
                "info"  : `Use of extend instead is recommended. Adds extra zero bits to the MSB of argument d of size m to make the datatype size n.`,
                "package" : "Prelude",
            },
            "signExtend" : {
                "type"  : `function`,
                "proto" : `function x#(n) signExtend (x#(m) d) provisos (Add#(k, m, n));`,
                "info"  : `Use of extend instead is recommended. Adds extra sign bits to the MSB of argument d of size m to make the datatype size n by replicating the sign bit.`,
                "package" : "Prelude",
            },
            "truncate" : {
                "type"  : `function`,
                "proto" : `function x#(m) truncate (x#(n) d) provisos (Add#(k, n, m));`,
                "info"  : `Removes bits from the MSB of argument d of size n to make the datatype size m.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "SaturatingArith" : {
        "type" : "typeclass",
        "info" : `The SaturatingArith typeclass contains modified addition and subtraction functions which saturate to the values defined by maxBound or minBound when the operation would otherwise over ow or wrap-around`,
        "proto" : `SaturatingArith#( type t);`,
        "methods" : {
            "satPlus" : {
                "type"  : `function`,
                "proto" : `function t satPlus (SaturationMode mode, t x, t y);`,
                "info"  : `Modified plus function which saturates when the operation would otherwise over-flow or wrap-around. The saturation value (maxBound, wrap, or 0) is determined by the value of mode, the SaturationMode.`,
                "package" : "Prelude",
            },
            "satMinus" : {
                "type"  : `function`,
                "proto" : `function t satMinus (SaturationMode mode, t x, t y);`,
                "info"  : `Modified minus function which saturates when the operation would otherwise overflow or wrap-around. The saturation value (minBound, wrap, minBound +1, or 0) is determined by the value of mode, the SaturationMode.`,
                "package" : "Prelude",
            },
            "boundedPlus" : {
                "type"  : `function`,
                "proto" : `function t boundedPlus (t x, t y) = satPlus (Sat_Bound, x, y);`,
                "info"  : `Modified plus function which saturates to maxBound when the operation would otherwise overflow or wrap-around. The function is the same as satPlus where the SaturationMode is Sat_Bound.`,
                "package" : "Prelude",
            },
            "boundedMinus" : {
                "type"  : `function`,
                "proto" : `function t boundedMinus (t x, t y) = satMinus(Sat_Bound, x, y);`,
                "info"  : `Modified minus function which saturates to minBound when the operation would otherwise overflow or wrap-around. The function is the same as satMinus where the SaturationMode is Sat_Bound.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Alias" : {
        "type" : "typeclass",
        "info" : `Alias specifies that two types can be used interchangeably, providing a way to introduce local names for types within a module. They are used in Provisos.`,
        "proto" : `Alias#(type a, type b) dependencies (a determines b, b determines a);`,
        "methods" : {
        },
        "package" : "Prelude",
    },
    "NumAlias" : {
        "type" : "typeclass",
        "info" : `Alias specifies that two types can be used interchangeably, providing a way to introduce local names for types within a module. They are used in Provisos.`,
        "proto" : `NumAlias#(numeric type a, numeric type b) dependencies (a determines b, b determines a);`,
        "methods" : {
        },
        "package" : "Prelude",
    },
    "FShow" : {
        "type" : "typeclass",
        "info" : `The FShow typeclass defines the types to which the function fshow can be applied. The function converts a value to an associated Fmt representation for use with the $display family of system tasks. Instances of the FShow class can often be automatically derived using the deriving statement`,
        "proto" : `FShow#(type t);`,
        "methods" : {
            "fshow" : {
                "type"  : `function`,
                "proto" : `function Fmt fshow(t value);`,
                "info"  : `Returns a Fmt representation when applied to a value`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "StringLiteral" : {
        "type" : "typeclass",
        "info" : `StringLiteral defines the class of types which can be created from strings.`,
        "proto" : `StringLiteral #(type data_t);`,
        "methods" : {
            "fromString" : {
                "type"  : `function`,
                "proto" : `function data_t fromString(String x);`,
                "info"  : `Converts an element x of datatype String into an element of data type data_t`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },


    // type define
    "Bit" : {
        "type" : "class",
        "info" : ``,
        "proto" : `Bit#(type n);`,
        "super" : [
            "Bits",
            "Eq",
            "Literal",
            "Arith",
            "Ord",
            "Bounded",
            "Bitwise",
            "BitReduction",
            "BitExtend",
        ],
        "methods" : {
            "bitconcat" : {
                "type"  : `function`,
                "proto" : `function Bit#(k) bitconcat(Bit#(n) x, Bit#(m) y) provisos (Add#(n, m, k));`,
                "info"  : `Concatenate two bit vectors, x of size n and y of size m returning a bit vector of size k. The Verilog operator { } is used.`,
            },
            "split" : {
                "type"  : `function`,
                "proto" : `function Tuple2 #(Bit#(n), Bit#(m)) split(Bit#(k) x) provisos (Add#(n, m, k));`,
                "info"  : `Split a bit vector into two bit vectors (higher-order bits (n), lowerorder bits (m)).`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "UInt" : {
        "type" : "class",
        "info" : `The UInt type is an unsigned fixed width representation of an integer value`,
        "proto" : `UInt#(type n);`,
        "super" : [
            "Bits",
            "Eq",
            "Literal",
            "Arith",
            "Ord",
            "Bounded",
            "Bitwise",
            "BitReduction",
            "BitExtend",
        ],
        "methods" : {},
        "package" : "Prelude",
    },
    "Int" : {
        "type" : "class",
        "info" : `The Int type is a signed fixed width representation of an integer value.`,
        "proto" : `UInt#(type n);`,
        "super" : [
            "Bits",
            "Eq",
            "Literal",
            "Arith",
            "Ord",
            "Bounded",
            "Bitwise",
            "BitReduction",
            "BitExtend",
        ],
        "methods" : {},
        "package" : "Prelude",
    },
    "Integer" : {
        "type" : "class",
        "info" : `The Integer type is a data type used for integer values and functions. Because Integer is not part of the Bits typeclass, the Integer type is used for static elaboration only; all values must be resolved at compile time.`,
        "proto" : `UInt#(type n);`,
        "super" : [
            "Eq",
            "Literal",
            "Arith",
            "Ord",
        ],
        "methods" : {
            "div" : {
                "type"  : `function`,
                "proto" : `function Integer div(Integer x, Integer y);`,
                "info"  : `Element x is divided by element y and the result is rounded toward negative infinity. Division by 0 is undefined.`,
                "package" : "Prelude",
            },
            "mod" : {
                "type"  : `function`,
                "proto" : `function Integer mod(Integer x, Integer y);`,
                "info"  : `Element x is divided by element y using the div function and the remainder is returned as an Integer value. div and mod satisfy the identity (div(x; y)y)+mod(x; y) == x. Division by 0 is undened`,
                "package" : "Prelude",
            },
            "quot" : {
                "type"  : `function`,
                "proto" : `function Integer quot(Integer x, Integer y);`,
                "info"  : `Element x is divided by element y and the result is truncated (rounded towards 0). Division by 0 is undefined.`,
                "package" : "Prelude",
            },
            "rem" : {
                "type"  : `function`,
                "proto" : `function Integer rem(Integer x, Integer y);`,
                "info"  : `Element x is divided by element y using the quot function and the remainder is returned as an Integer value. quot and rem satisfy the identity (quot(x, y) * y) + rem(x; y) == x. Division by 0 is undefined.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Bool" : {
        "type" : "class",
        "info" : `The Bool type is defined to have two values, True and False.`,
        "proto" : `typedef enum {False, True} Bool;`,
        "super" : [
            "Bits",
            "Eq",
        ],
        "methods" : {
            "not" : {
                "type"  : `function`,
                "proto" : `function Bool not (Bool x);`,
                "info"  : `Returns True if x is false, returns False if x is true.`,
                "package" : "Prelude",
            },
            "&&" : {
                "type"  : `function`,
                "proto" : `function Bool \&& (Bool x, Bool y);`,
                "info"  : `Returns True if x and y are true, else it returns False.`,
            },
            "||" : {
                "type"  : `function`,
                "proto" : `function Bool \|| (Bool x, Bool y);`,
                "info"  : `Returns True if x or y is true, else it returns False.`,
            },
        },
        "package" : "Prelude",
    },
    "Real" : {
        "type" : "class",
        "info" : `The Real type is a data type used for real values and functions.`,
        "proto" : `Real`,
        "super" : [
            "Eq",
            "Literal",
            "RealLiteral",
            "Arith",
            "Ord",
        ],
        "methods" : {
            "$realtobits" : {
                "type"  : `function`,
                "proto" : `function Bit#(64) $realtobits (Real x) ;`,
                "info"  : `Converts from a Real to the IEEE 64-bit vector representation.`,
                "package" : "Prelude",
            },
            "$bitstoreal" : {
                "type"  : `function`,
                "proto" : `function Real $bitstoreal (Bit#(64) x) ;`,
                "info"  : `Converts from a 64-bit vector representation to a Real.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "String" : {
        "type" : "class",
        "info" : `Strings are mostly used in system tasks (such as $display). The String type belongs to the Eq type class; strings can be tested for equality and inequality using the == and != operators. The String type is also part of the Arith class, but only the addition (+) operator is defined. All other Arith operators will produce an error message.`,
        "proto" : `String`,
        "super" : [
            "Eq",
            "Arith",
            "StringLiteral",
            "FShow",
        ],
        "methods" : {
            "strConcat" : {
                "type"  : `function`,
                "proto" : `function String strConcat(String s1, String s2);`,
                "info"  : `Concatenates two strings (same as the + operator)`,
                "package" : "Prelude",
            },
            "stringLength" : {
                "type"  : `function`,
                "proto" : `function Integer stringLength (String s);`,
                "info"  : `Returns the number of characters in a string`,
                "package" : "Prelude",
            },
            "stringSplit" : {
                "type"  : `function`,
                "proto" : `function Maybe#(Tuple#2(Char, String)) stringSplit(String s);`,
                "info"  : `If the string is empty, returns Invalid; otherwise it returns Valid with the Tuple containing the first character as the head and the rest of the string as the tail.`,
                "package" : "Prelude",
            },
            "stringHead" : {
                "type"  : `function`,
                "proto" : `function Char stringHead(String s);`,
                "info"  : `Extracts the first character of a string; reports an error if the string is empty.`,
                "package" : "Prelude",
            },
            "stringTail" : {
                "type"  : `function`,
                "proto" : `function String stringTail(String s);`,
                "info"  : `Extracts all the characters of a string after the first; reports an error if the string is empty.`,
                "package" : "Prelude",
            },
            "stringCons" : {
                "type"  : `function`,
                "proto" : `function String stringCons(Char c, String s);`,
                "info"  : `Adds a character to the front of a string. This function is the complement of stringSplit.`,
                "package" : "Prelude",
            },
            "stringToCharList" : {
                "type"  : `function`,
                "proto" : `function List#(Char) stringToCharList (String s);`,
                "info"  : `Converts a String to a List of characters`,
                "package" : "Prelude",
            },
            "charListToString" : {
                "type"  : `function`,
                "proto" : `function String charListToString (List#(Char) cs);`,
                "info"  : `Converts a List of characters to a String`,
                "package" : "Prelude",
            },
            "quote" : {
                "type"  : `function`,
                "proto" : `function String quote (String s);`,
                "info"  : `Add single quotes around a string`,
                "package" : "Prelude",
            },
            "doubleQuote" : {
                "type"  : `function`,
                "proto" : `function String doubleQuote (String s);`,
                "info"  : `Add double quotes around a string`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Char" : {
        "type" : "class",
        "info" : `The Char data type is used mostly in system tasks (such as $display). The Char type provides the ability to traverse the characters of a string. The Char type belongs to the Eq type class; chars can be tested for equality and inequality using the == and != operators.`,
        "proto" : `Char`,
        "super" : [
            "Eq",
            "Ord",
            "StringLiteral",
            "FShow",
        ],
        "methods" : {
            "charToString" : {
                "type"  : `function`,
                "proto" : `function String charToString (Char c);`,
                "info"  : `Convert a single character to a string`,
                "package" : "Prelude",
            },
            "charToInteger" : {
                "type"  : `function`,
                "proto" : `function Integer charToInteger (Char c);`,
                "info"  : `Convert a character to its ASCII numeric value`,
                "package" : "Prelude",
            },
            "integerToChar" : {
                "type"  : `function`,
                "proto" : `function Char integerToChar (Integer n);`,
                "info"  : `Convert an ASCII value to its character equivalent, returns an error if the number is out of range`,
                "package" : "Prelude",
            },
            "isSpace" : {
                "type"  : `function`,
                "proto" : `function Bool isSpace (Char c);`,
                "info"  : `Determine if a character is whitespace (space, tab \\t, vertical tab \\v, newline \\n, carriage return \\r, linefeed \\f)`,
                "package" : "Prelude",
            },
            "isLower" : {
                "type"  : `function`,
                "proto" : `function Bool isLower (Char c);`,
                "info"  : `Determine if a character is a lowercase ASCII character (a - z)`,
                "package" : "Prelude",
            },
            "isUpper" : {
                "type"  : `function`,
                "proto" : `function Bool isUpper (Char c);`,
                "info"  : `Determine if a character is an uppercase ASCII character (A - Z)`,
                "package" : "Prelude",
            },
            "isAlpha" : {
                "type"  : `function`,
                "proto" : `function Bool isAlpha (Char c);`,
                "info"  : `Determine if a character is an ASCII letter, either upper or lowercase`,
                "package" : "Prelude",
            },
            "isDigit" : {
                "type"  : `function`,
                "proto" : `function Bool isDigit (Char c);`,
                "info"  : `Determine if a character is an ASCII decimal digit (0 - 9)`,
                "package" : "Prelude",
            },
            "isAlphaNum" : {
                "type"  : `function`,
                "proto" : `function Bool isAlphaNum (Char c);`,
                "info"  : `Determine if a character is an ASCII letter or decminal digit`,
                "package" : "Prelude",
            },
            "isOctDigit" : {
                "type"  : `function`,
                "proto" : `function Bool isOctDigit (Char c);`,
                "info"  : `Determine if a character is an ASCII octal digit (0 - 7)`,
                "package" : "Prelude",
            },
            "isHexDigit" : {
                "type"  : `function`,
                "proto" : `function Bool isHexDigit (Char c);`,
                "info"  : `Determine if a character is an ASCII hexadecimal digit (0 - 9, a - f, or A - F)`,
                "package" : "Prelude",
            },
            "toUpper" : {
                "type"  : `function`,
                "proto" : `function Char toUpper (Char c);`,
                "info"  : `Convert an ASCII lowercase letter to uppercase; other characters are unchanged`,
                "package" : "Prelude",
            },
            "toLower" : {
                "type"  : `function`,
                "proto" : `function Char toLower (Char c);`,
                "info"  : `Convert an ASCII uppercase letter to lowercase; other characters are unchanged`,
                "package" : "Prelude",
            },
            "digitToInteger" : {
                "type"  : `function`,
                "proto" : `function Integer digitToInteger (Char c);`,
                "info"  : `Convert an ASCII decimal digit to its numeric value (0 to 0, unlike charToInteger which would return the ASCII code 48); returns an error if the character is not a digit.`,
                "package" : "Prelude",
            },
            "digitToBits" : {
                "type"  : `function`,
                "proto" : `function Bit#(n) digitToBits (Char c);`,
                "info"  : `Convert an ASCII decimal digit to its numeric value; returns an error if the character is not a digit. Same as digitToInteger, but returns the value as a bit vector; the vector can be any size, but the user will get an error if the size is too small to represent the value`,
                "package" : "Prelude",
            },
            "integerToDigit" : {
                "type"  : `function`,
                "proto" : `function Char integerToDigit (Integer d);`,
                "info"  : `Convert a decimal digit value (0 to 9) to the ASCII character for that digit; returns an error if the value is out of range. This function is the complement of digitToInteger`,
                "package" : "Prelude",
            },
            "bitsToDigit" : {
                "type"  : `function`,
                "proto" : `function Char bitsToDigit (Bit#(n) d);`,
                "info"  : `Convert a Bit type digit value to the ASCII character for that digit; returns an error if the value is out of range. This is the same as integerToDigit but for values that are Bit types`,
                "package" : "Prelude",
            },
            "hexDigitToInteger" : {
                "type"  : `function`,
                "proto"  : `function Integer hexDigitToInteger (Char c);`,
                "info" : `Convert an ASCII decimal digit to its numeric, including hex characters a - f and A - F`,
                "package" : "Prelude",
            },
            "hexDigitToBits" : {
                "type"  : `function`,
                "proto" : `function Bit#(n) hexDigitToBits (Char c);`,
                "info"  : `Convert an ASCII decimal digit to its numeric, including hex characters a - f and A - F returning the value as a bit vector. The vector can be any size, but an error will be returned if the size is too small to represent the value.`,
                "package" : "Prelude",
            },
            "integerToHexDigit" : {
                "type"  : `function`,
                "proto" : `function Char integerToHexDigit (Integer d);`,
                "info"  : `Convert a hexadecimal digit value (0 to 15) to the ASCII character for that digit; returns an error if the value is out of range. This function is the complement of hexDigitToInteger. The function returns lowercase for the letters a to f; apply the function toUpper to get uppercase.`,
                "package" : "Prelude",
            },
            "bitsToHexDigit" : {
                "type"  : `function`,
                "proto" : `function Char bitsToHexDigit (Bit#(n) d);`,
                "info"  : `Convert a Bit type hexadecimal digit value to the ASCII character for that digit, returns an error if the value is out of range. The function returns lowercase for the letters a to f; apply the function toUpper to get uppercase.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Fmt" : {
        "type" : "class",
        "info" : `The Fmt primitive type provides a representation of arguments to the $display family of system tasks that can be manipulated in BSV code. Fmt representations of data objects can be written hierarchically and applied to polymorphic types.`,
        "proto" : `Fmt`,
        "super" : [
            "Literal",
            "Arith",
        ],
        "methods" : {},
        "package" : "Prelude",
    },
    "Void" : {
        "type" : "class",
        "info" : `The Void type is a type which has one literal ? used for constructing concrete values of the type void . The Void type is part of the Bits and Literal typeclasses.`,
        "proto" : `void`,
        "super" : [
            "Bits",
            "Literal",
        ],
        "methods" : {},
        "package" : "Prelude",
    },
    "Maybe" : {
        "type" : "class",
        "info" : `The Maybe type is used for tagging values as either Valid or Invalid. If the value is Valid, the value contains a datatype data_t.`,
        "proto" : `Maybe #(type data_t)`,
        "super" : [
            "Bits",
            "Eq",
        ],
        "methods" : {
            "fromMaybe" : {
                "type"  : `function`,
                "proto" : `function data_t fromMaybe( data_t defaultval, Maybe#(data_t) val ) ;`,
                "info"  : `Extracts the Valid value out of a Maybe argument. If the tag is Invalid the default value, defaultval, is returned`,
            },
            "isValid" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Returns a value of True if the Maybe argument is Valid.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "Tuple2" : {
        "type" : "class",
        "info" : `Tuples are predefined structures which group a small number of values together. The following pseudo code explains the structure of the tuples. You cannot define your own tuples, but must use the seven predefined tuples, Tuple2 through Tuple8. As shown, Tuple2 groups two items together, Tuple3 groups three items together, up through Tuple8 which groups eight items together.`,
        "proto" : `Tuple2 #(type a, type b) deriving (Bits, Eq, Bounded);`,
        "super" : [
            "Bits",
            "Eq",
            "Ord",
            "Bounded",
        ],
        "methods" : {
            "tuple2" :{
                "type"  : `function`,
                "proto" : `function Tuple2 tuple2 (e1, e2)`,
                "info"  : `Creates a variable of type Tuple2 with component values e1 and e2.`
            },
            "tpl_1" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the first field of x from a Tuple.`,
            },
            "tpl_2" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the second field of x from a Tuple.`,
            },
        },
        "package" : "Prelude",
    },
    "Tuple3" : {
        "type" : "class",
        "info" : `Tuples are predefined structures which group a small number of values together. The following pseudo code explains the structure of the tuples. You cannot define your own tuples, but must use the seven predefined tuples, Tuple2 through Tuple8. As shown, Tuple2 groups two items together, Tuple3 groups three items together, up through Tuple8 which groups eight items together.`,
        "proto" : `Tuple3 #(type a, type b, type c) deriving (Bits, Eq, Bounded);`,
        "super" : [
            "Bits",
            "Eq",
            "Ord",
            "Bounded",
        ],
        "methods" : {
            "tuple3" :{
                "type"  : `function`,
                "proto" : `function Tuple3 tuple3 (e1, e2, e3)`,
                "info"  : `Creates a variable of type Tuple3 with component values e1 e2 and e3.`
            },
            "tpl_1" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the first field of x from a Tuple.`,
            },
            "tpl_2" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the second field of x from a Tuple.`,
            },
            "tpl_3" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the third field of x from a Tuple.`,
            },
        },
        "package" : "Prelude",
    },
    "Tuple4" : {
        "type" : "class",
        "info" : `Tuples are predefined structures which group a small number of values together. The following pseudo code explains the structure of the tuples. You cannot define your own tuples, but must use the seven predefined tuples, Tuple2 through Tuple8. As shown, Tuple2 groups two items together, Tuple3 groups three items together, up through Tuple8 which groups eight items together.`,
        "proto" : `Tuple4 #(type a, type b, type c, type d) deriving (Bits, Eq, Bounded);`,
        "super" : [
            "Bits",
            "Eq",
            "Ord",
            "Bounded",
        ],
        "methods" : {
            "tuple4" :{
                "type"  : `function`,
                "proto" : `function Tuple4 tuple4 (e1, e2, e3, e4)`,
                "info"  : `Creates a variable of type Tuple4 with component values e1 e2 e3 and e4.`
            },
            "tpl_1" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the first field of x from a Tuple.`,
            },
            "tpl_2" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the second field of x from a Tuple.`,
            },
            "tpl_3" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the third field of x from a Tuple.`,
            },
            "tpl_4" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fourth field of x from a Tuple.`,
            },
        },
        "package" : "Prelude",
    },
    "Tuple5" : {
        "type" : "class",
        "info" : `Tuples are predefined structures which group a small number of values together. The following pseudo code explains the structure of the tuples. You cannot define your own tuples, but must use the seven predefined tuples, Tuple2 through Tuple8. As shown, Tuple2 groups two items together, Tuple3 groups three items together, up through Tuple8 which groups eight items together.`,
        "proto" : `Tuple5 #(type a, type b, type c, type d, type e) deriving (Bits, Eq, Bounded);`,
        "super" : [
            "Bits",
            "Eq",
            "Ord",
            "Bounded",
        ],
        "methods" : {
            "tuple5" :{
                "type"  : `function`,
                "proto" : `function Tuple5 tuple5 (e1, e2, e3, e4, e5)`,
                "info"  : `Creates a variable of type Tuple5 with component values e1 e2 e3 e4 and e5.`
            },
            "tpl_1" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the first field of x from a Tuple.`,
            },
            "tpl_2" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the second field of x from a Tuple.`,
            },
            "tpl_3" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the third field of x from a Tuple.`,
            },
            "tpl_4" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fourth field of x from a Tuple.`,
            },
            "tpl_5" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fifth field of x from a Tuple.`,
            },
        },
        "package" : "Prelude",
    },
    "Tuple6" : {
        "type" : "class",
        "info" : `Tuples are predefined structures which group a small number of values together. The following pseudo code explains the structure of the tuples. You cannot define your own tuples, but must use the seven predefined tuples, Tuple2 through Tuple8. As shown, Tuple2 groups two items together, Tuple3 groups three items together, up through Tuple8 which groups eight items together.`,
        "proto" : `Tuple6 #(type a, type b, type c, type d, type e, type f) deriving (Bits, Eq, Bounded);`,
        "super" : [
            "Bits",
            "Eq",
            "Ord",
            "Bounded",
        ],
        "methods" : {
            "tuple5" :{
                "type"  : `function`,
                "proto" : `function Tuple6 tuple6 (e1, e2, e3, e4, e5, e6)`,
                "info"  : `Creates a variable of type Tuple6 with component values e1 e2 e3 e4 e5 and e6.`
            },
            "tpl_1" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the first field of x from a Tuple.`,
            },
            "tpl_2" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the second field of x from a Tuple.`,
            },
            "tpl_3" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the third field of x from a Tuple.`,
            },
            "tpl_4" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fourth field of x from a Tuple.`,
            },
            "tpl_5" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fifth field of x from a Tuple.`,
            },
            "tpl_6" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the sixth field of x from a Tuple.`,
            },
        },
        "package" : "Prelude",
    },
    "Tuple7" : {
        "type" : "class",
        "info" : `Tuples are predefined structures which group a small number of values together. The following pseudo code explains the structure of the tuples. You cannot define your own tuples, but must use the seven predefined tuples, Tuple2 through Tuple8. As shown, Tuple2 groups two items together, Tuple3 groups three items together, up through Tuple8 which groups eight items together.`,
        "proto" : `Tuple7 #(type a, type b, type c, type d, type e, type f, type g) deriving (Bits, Eq, Bounded);`,
        "super" : [
            "Bits",
            "Eq",
            "Ord",
            "Bounded",
        ],
        "methods" : {
            "tuple5" :{
                "type"  : `function`,
                "proto" : `function Tuple7 tuple7 (e1, e2, e3, e4, e5, e6, e7)`,
                "info"  : `Creates a variable of type Tuple7 with component values e1 e2 e3 e4 e5 e6 and e7.`
            },
            "tpl_1" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the first field of x from a Tuple.`,
            },
            "tpl_2" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the second field of x from a Tuple.`,
            },
            "tpl_3" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the third field of x from a Tuple.`,
            },
            "tpl_4" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fourth field of x from a Tuple.`,
            },
            "tpl_5" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fifth field of x from a Tuple.`,
            },
            "tpl_6" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the sixth field of x from a Tuple.`,
            },
            "tpl_7" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the seventh field of x from a Tuple.`,
            },
        },
        "package" : "Prelude",
    },
    "Tuple8" : {
        "type" : "class",
        "info" : `Tuples are predefined structures which group a small number of values together. The following pseudo code explains the structure of the tuples. You cannot define your own tuples, but must use the seven predefined tuples, Tuple2 through Tuple8. As shown, Tuple2 groups two items together, Tuple3 groups three items together, up through Tuple8 which groups eight items together.`,
        "proto" : `Tuple8 #(type a, type b, type c, type d, type e, type f, type g, type h) deriving (Bits, Eq, Bounded);`,
        "super" : [
            "Bits",
            "Eq",
            "Ord",
            "Bounded",
        ],
        "methods" : {
            "tuple5" :{
                "type"  : `function`,
                "proto" : `function Tuple8 tuple8 (e1, e2, e3, e4, e5, e6, e7, e8)`,
                "info"  : `Creates a variable of type Tuple8 with component values e1 e2 e3 e4 e5 e6 e7 and e8.`
            },
            "tpl_1" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the first field of x from a Tuple.`,
            },
            "tpl_2" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the second field of x from a Tuple.`,
            },
            "tpl_3" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the third field of x from a Tuple.`,
            },
            "tpl_4" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fourth field of x from a Tuple.`,
            },
            "tpl_5" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the fifth field of x from a Tuple.`,
            },
            "tpl_6" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the sixth field of x from a Tuple.`,
            },
            "tpl_7" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the seventh field of x from a Tuple.`,
            },
            "tpl_8" : {
                "type"  : `function`,
                "proto" : ``,
                "info"  : `Extracts the eighth field of x from a Tuple.`,
            },
        },
        "package" : "Prelude",
    },
    "Array" : {
        "type" : "class",
        "info" : `Array variables are generally declared anonymously, using the bracket syntax. However, the type of such variables can be expressed with the type constructor Array, when an explicit type is needed.`,
        "proto" : ``,
        "super" : [
            "Eq",
        ],
        "methods" : {
        },
        "package" : "Prelude",
    },
    "Ordering" : {
        "type" : "class",
        "info" : `The Ordering type is used as the return type for the result of generic comparators, including the compare function defined in the Ord (Section 2.1.7) type class. The valid values of Ordering are: LT, GT, and EQ.`,
        "proto" : `
        typedef enum {
            LT,
            EQ,
            GT
            } Ordering deriving (Eq, Bits, Bounded);`,
        "super" : [
            "Eq",
            "Bits",
            "Bounded",
        ],
        "methods" : {
        },
        "package" : "Prelude",
    },
    "File" : {
        "type" : "class",
        "info" : `File is a defined type in BSV which is defined as:`,
        "proto" : `
        typedef union tagged {
            void InvalidFile ;
            Bit#(31) MCD;
            Bit#(31) FD;
            } File;`,
        "super" : [
            "Eq",
            "Bits",
            "Bitwise",
        ],
        "methods" : {
        },
        "package" : "Prelude",
    },
    "Clock" : {
        "type" : "class",
        "info" : `Clock is an abstract type of two components: a single Bit oscillator and a Bool gate.`,
        "proto" : `typedef ... Clock ;`,
        "super" : [
            "Eq",
        ],
        "methods" : {
        },
        "package" : "Prelude",
    },
    "Reset" : {
        "type" : "class",
        "info" : `Reset is an abstract type.`,
        "proto" : `typedef ... Reset ;`,
        "super" : [
            "Eq",
        ],
        "methods" : {
        },
        "package" : "Prelude",
    },
    "Inout" : {
        "type" : "class",
        "info" : `An Inout type is a first class type that is used to pass Verilog inouts through a BSV module. It takes an argument which is the type of the underlying signal`,
        "proto" : `Inout#(type t)`,
        "super" : [
        ],
        "methods" : {
        },
        "package" : "Prelude",
    },
    "Action" : {
        "type" : "class",
        "info" : `The Action type is a special case of the more general type ActionValue where nothing is returned. That is, the returns type is (void)`,
        "proto" : `typedef ActionValue#(void) Action;`,
        "super" : [
        ],
        "methods" : {
            "noAction" : {
                "type"  : "function",
                "proto" : "function Action noAction();",
                "info"  : "An empty Action, this is an Action that does nothing.",
            }
        },
        "package" : "Prelude",
    },
    "Rules" : {
        "type" : "class",
        "info" : `A rule expression has type Rules and consists of a collection of individual rule constructs. Rules are first class objects, hence variables of type Rules may be created and manipulated. Rules values must eventually be added to a module in order to appear in synthesized hardware.`,
        "proto" : `typedef ActionValue#(void) Action;`,
        "super" : [
        ],
        "methods" : {
            "emptyRules" : {
                "type"  : "function",
                "proto" : `function Rules emptyRules();`,
                "info"  : `An empty rules variable.`,
            },
            "addRules" : {
                "type"  : "module",
                "proto" : `module addRules#(Rules r) (Empty);`,
                "info"  : `Takes rules r and adds them into a module. This function may only be called from within a module. The return type Empty indicates that the instantiation does not return anything.`,
                "package" : "Prelude",
            },
            "rJoin" : {
                "type"  : "function",
                "proto" : `function Rules rJoin(Rules x, Rules y);`,
                "info"  : `Symmetric union of two sets of rules. A symmetric union means that neither set is implied to have any relation to the other: not more urgent, not execute before, etc.`,
                "package" : "Prelude",
            },
            "rJoinPreempts" : {
                "type"  : "function",
                "proto" : `function Rules rJoinPreempts(Rules x, Rules y);`,
                "info"  : `Union of two sets of rules, with rules on the left getting scheduling precedence and blocking the rules on the right.That is, if a rule in set x fires, then all rules in set y are prevented from firing. This is the same as specifying descending_urgency plus a forced conflict.`,
                "package" : "Prelude",
            },
            "rJoinDescendingUrgency" : {
                "type"  : "function",
                "proto" : `function Rules rJoinDescendingUrgency(Rules(Rules x, Rules y);`,
                "info"  : `Union of two sets of rule, with rules in the left having higher urgency.That is, if some rules compete for resources, then scheduling will select rules in set x set before set y. If the rules do not con ict, no conflict is added; the rules can fire together.`,
                "package" : "Prelude",
            },
            "rJoinMutuallyExclusive" : {
                "type"  : "function",
                "proto" : `function Rules rJoinMutuallyExclusive(Rules x, Rules y);`,
                "info"  : `Union of two sets of rule, with rules in the all rules in the left set annotated as mutually exclusive with all rules in the right set.No relationship between the rules in the left set or between the rules in the right set is assumed. This annotation is used in scheduling and checked during simulation.`,
                "package" : "Prelude",
            },
            "rJoinExecutionOrder" : {
                "type"  : "function",
                "proto" : `function Rules rJoinExecutionOrder(Rules(Rules x, Rules y);`,
                "info"  : `Union of two sets of rule, with the rules in the left set executing before the rules in the right set.No relationship between the rules in the left set or between the rules in the right set is assumed. If any pair of rules cannot execute in the specified order in the same clock cycle, that pair of rules will conflict.`,
                "package" : "Prelude",
            },
            "rJoinConflictFree" : {
                "type"  : "function",
                "proto" : `function Rules rJoinConflictFree(Rules x, Rules y);`,
                "info"  : `Union of two sets of rule, with the rules in the left set annotated as conflict-free with the rules in the right set. This assumption is used during scheduling and checked during simulation. No relationship between the rules in the left set or between the rules in the right set is assumed.`,
                "package" : "Prelude",
            },
        },
        "package" : "Prelude",
    },
    "TAdd" : {
        "type" : "function",
        "info" : "Calculate n1 + n2",
        "proto" : "function TAdd#(n1,n2)",
        "package" : "Prelude",
    },
    "TSub" : {
        "type" : "function",
        "info" : "Calculate n1 - n2",
        "proto" : "function TSub#(n1,n2)",
        "package" : "Prelude",
    },
    "TMul" : {
        "type" : "function",
        "info" : "Calculate n1 * n2",
        "proto" : "function TSub#(n1,n2)",
        "package" : "Prelude",
    },
    "TDiv" : {
        "type" : "function",
        "info" : "Calculate ceiling n1/n2",
        "proto" : "function TDiv#(n1,n2)",
        "package" : "Prelude",
    },
    "TLog" : {
        "type" : "function",
        "info" : "Calculate ceiling log2(n1)",
        "proto" : "function TLog#(n1)",
        "package" : "Prelude",
    },
    "TExp" : {
        "type" : "function",
        "info" : "Calculate 2^n1",
        "proto" : "function TExp#(n1)",
        "package" : "Prelude",
    },
    "TMax" : {
        "type" : "function",
        "info" : "Calculate max(n1; n2)",
        "proto" : "function TMax#(n1,n2)",
        "package" : "Prelude",
    },
    "TMin" : {
        "type" : "function",
        "info" : "Calculate min(n1; n2)",
        "proto" : "function TMin#(n1,n2)",
        "package" : "Prelude",
    },

    // valueOf and SizeOf pseudo-functions
    "valueOf" : {
        "type" : "function",
        "info" : "Converts a numeric type into its Integer value.",
        "proto" : "function Integer valueOf (t) ;",
        "package" : "Prelude",
    },
    "valueof" : {
        "type" : "function",
        "info" : "Converts a numeric type into its Integer value.",
        "proto" : "function Integer valueof (t) ;",
        "package" : "Prelude",
    },
    "SizeOf" : {
        "type" : "function",
        "info" : "Converts a type into a numeric type representing its bit size.",
        "proto" : `function t SizeOf#(any_type) provisos (Bits#(any_type, sa)) ;`,
        "package" : "Prelude",
    },

    // reg and wires
    "Reg" : {
        "type" : "class",
        "info" : `The most elementary module available in BSV is the register, which has a Reg interface. Registers
        are polymorphic, i.e., in principle they can hold a value of any type but, of course, ultimately registers
        store bits. Thus, the provisos on register modules indicate that the type of the value stored in the
        register must be in the Bits type class, i.e., the operations pack and unpack are dened on the type
        to convert into bits and back.`,
        "proto" : `
        interface Reg #(type a_type);
            method Action _write(a_type x1);
            method a_type _read();
        endinterface: Reg`,
         "super" : [
            
        ],
        "methods" : {
            "_write" : {
                "type"  : "method",
                "proto" : `method Action _write(a_type x1);`,
                "info"  : `writes a value x1`,
            },
            "_read" : {
                "type"  : "method",
                "proto" : `method a_type _read();`,
                "info"  : `returns the value of the register`,

            },
        },
        "package" : "Prelude",
    },
    "mkReg" : {
        "type" : "module",
        "info" : "Make a register with a given reset value. Reset logic is synchronous.",
        "proto" : `module mkReg#(parameter a_type resetval)(Reg#(a_type)) provisos (Bits#(a_type, sizea));`,
        "package" : "Prelude",
    },
    "mkRegU" : {
        "type" : "module",
        "info" : `Make a register without any reset; initial simulation value is alternating 01 bits.`,
        "proto" : `module mkRegU(Reg#(a_type)) provisos (Bits#(a_type, sizea));`,
        "package" : "Prelude",
    },
    "mkRegA" : {
        "type" : "module",
        "info" : `Make a register with a given reset value. Reset logic is asynchronous.`,
        "proto" : `module mkRegA#(parameter a_type resetval)(Reg#(a_type)) provisos (Bits#(a_type, sizea));`,
        "package" : "Prelude",
    },

    "asReg" : {
        "type" : "function",
        "info" : `Treat a register as a register, i.e., suppress the normal behavior where the interface name implicitly represents the value that the register contains (the _read value). This function returns the register interface, not the value of the register.`,
        "proto" : `function Reg#(a_type) asReg(Reg#(a_type) regIfc);`,
        "package" : "Prelude",
    },
    "readReg" : {
        "type" : "function",
        "info" : `Read the value out of a register. Useful for giving as the argument to higher-order vector and list functions.`,
        "proto" : `function a_type readReg(Reg#(a_type) regIfc);`
    },
    "writeReg" : {
        "type" : "function",
        "info" : `Write a value into a register. Useful for giving as the argument to higherorder vector and list functions.`,
        "proto" : `function Action writeReg(Reg#(a_atype) regIfc, a_type din);`,
        "package" : "Prelude",
    },

    "mkCReg" : {
        "type" : "module",
        "info" : `Make a concurrent register with a given number of ports and with a given reset value. Reset logic is synchronous.`,
        "proto" : `
        module mkCReg#(parameter Integer n,
            parameter a_type resetval)
            (Reg#(a_type) ifc[])
            provisos (Bits#(a_type, sizea));
        `,
        "package" : "Prelude",
    },
    "mkCRegU" : {
        "type" : "module",
        "info" : `Make a concurrent register with a given number of ports and without any reset. Initial simulation value is alternating 01 bits.`,
        "proto" : `module mkCRegU#(parameter Integer n) (Reg#(a_type) ifc[]) provisos (Bits#(a_type, sizea));`,
        "package" : "Prelude",
    },
    "mkCRegA" : {
        "type" : "module",
        "info" : `Make a concurrent register with a given number of ports and with a given reset value. Reset logic is asynchronous.`,
        "proto" : `
        module mkCRegA#(parameter Integer n,
            parameter a_type resetval)
            (Reg#(a_type) ifc[])
            provisos (Bits#(a_type, sizea));`,
        "package" : "Prelude",
    },

    "RWire" : {
        "type" : "class",
        "info" : `An RWire is a primitive stateless module whose purpose is to allow data transfer between methods and rules without the cycle latency of a register. That is, a RWire may be written in a cycle and that value can be read out in the same cycle; values are not stored across clock cycles.`,
        "proto" : `
        interface RWire#(type element_type) ;
            method Action wset(element_type datain) ;
            method Maybe#(element_type) wget() ;
        endinterface: RWire`,
         "super" : [
            
        ],
        "methods" : {
            "wset" : {
                "proto" : `method Action wset(element_type datain) ;`,
                "info"  : `writes a value and sets the valid signal`,
            },
            "wget" : {
                "proto" : `method Maybe#(element_type) wget();`,
                "info"  : `returns the value and the valid signal`,
            },
        },
        "package" : "Prelude",
    },

    "mkRWireSBR" : {
        "type" : "module",
        "info" : `Creates an RWire. Output is only valid if a write has occurred in the same clock cycle. This is the recommended module to use to create an RWire.`,
        "proto" : `module mkRWireSBR(RWire#(element_type)) provisos (Bits#(element_type, element_width)) ;`,
        "package" : "Prelude",
    },
    "mkRWire" : {
        "type" : "module",
        "info" : `Creates an RWire. Output is only valid if a write has occurred in the same clock cycle. The write (wset) must be sequenced before the read (wget) and they must be in dierent rules.`,
        "proto" : `module mkRWire(RWire#(element_type)) provisos (Bits#(element_type, element_width)) ;`,
        "package" : "Prelude",
    },
    "mkUnsafeRWire" : {
        "type" : "module",
        "info" : `Creates an RWire. Output is only valid if a write has occurred in the same clock cycle. The write (wset) must be sequenced before the read (wget) but they can be in the same rule.`,
        "proto" : `module mkUnsafeRWire(RWire#(element_type)) provisos (Bits#(element_type, element_width)) ;`,
        "package" : "Prelude",
    },


    "Wire" : {
        "type" : "class",
        "info" : `The Wire interface and module are similar to RWire, but the valid bit is hidden from the user and the validity of the read is considered an implicit condition. The Wire interface works like the Reg interface, so mentioning the name of the wire gets (reads) its contents whenever they're valid, and using <= writes the wire. Wire is an RWire that is designed to be interchangeable with Reg. You can replace a Reg with a Wire without changing the syntax.`,
        "proto" : `
        interface Wire#(type element_type) ;
            method _write wset(element_type datain) ;
            method _read#(element_type) wget() ;
        endinterface: Wire`,
         "super" : [
        ],
        "methods" : {
            "_write" : {
                "proto" : `method Action _write(element_type datain) ;`,
                "info"  : `writes a value x1`,
            },
            "_read" : {
                "proto" : `method element_type _read();`,
                "info"  : `returns the value of the wire`,
            },
        }
    },
    "mkWire" : {
        "type" : "module",
        "info" : `Creates a Wire. Validity of the output is automatically checked as an implicit condition of the read method. The write and the read methods must be in different rules.`,
        "proto" : `module mkWire(Wire#(element_type)) provisos (Bits#(element_type, element_width));`,
        "package" : "Prelude",
    },
    "mkUnsafeWire" : {
        "type" : "module",
        "info" : `Creates a Wire. Validity of the output is automatically checked as an implicit condition of the read method. The write and the read methods can be in the same rule.`,
        "proto" : `module mkUnsafeWire(Wire#(element_type)) provisos (Bits#(element_type, element_width));`,
        "package" : "Prelude",
    },
    "mkBypassWire" : {
        "type" : "module",
        "info" : `Creates a BypassWire. The write method is always enabled.`,
        "proto" : `module mkBypassWire(Wire#(element_type)) provisos (Bits#(element_type, element_width));`,
        "package" : "Prelude",
    },
    "mkDWire" : {
        "type" : "module",
        "info" : `Creates a DWire. The read method is always ready`,
        "proto" : `module mkDWire#(a_type defaultval)(Wire#(element_type)) provisos (Bits#(element_type, element_width));`,
        "package" : "Prelude",
    },
    "mkUnsafeDWire" : {
        "type" : "module",
        "info" : `Creates a DWire. The read method is always ready`,
        "proto" : `module mkUnsafeDWire#(a_type defaultval)(Wire#(element_type)) provisos (Bits#(element_type, element_width));`,
        "package" : "Prelude",
    },
    

    "PulseWire" : {
        "type" : "class",
        "info" : `The PulseWire interface is an RWire without any data. It is useful within rules and action methods to signal other methods or rules in the same clock cycle. Note that because the read method is called _read, the register shorthand can be used to get its value without mentioning the method _read (it is implicitly added).`,
        "proto" : `
        interface PulseWire;
            method Action send();
            method Bool _read();
        endinterface`,
         "super" : [
        ],
        "methods" : {
            "send" : {
                "type"  : "method",
                "proto" : `method Action send();`,
                "info"  : `sends a signal down the wire`,
            },
            "_read" : {
                "type"  : "method",
                "proto" : `method Bool _read();`,
                "info"  : `returns the valid signal`,
            },
        },
        "package" : "Prelude",
    },
    "mkPulseWire" : {
        "type" : "module",
        "info" : `The writing to this type of wire is used in rules and action methods to send a single bit to signal other methods or rules in the same clock cycle.`,
        "proto" : `module mkPulseWire(PulseWire);`,
        "package" : "Prelude",
    },
    "mkPulseWireOR" : {
        "type" : "module",
        "info" : `Returns a PulseWire which acts like a logical "Or". The send method of the same wire can be used in two dierent rules without confiict.`,
        "proto" : `module mkPulseWireOR(PulseWire);`,
        "package" : "Prelude",
    },
    "mkUnsafePulseWire" : {
        "type" : "module",
        "info" : `The writing to this type of wire is used in rules and action methods to send a single bit to signal other methods or rules in the same clock cycle. The send and _read methods can be in the same rule.`,
        "proto" : `module mkUnsafePulseWire(PulseWire);`,
        "package" : "Prelude",
    },
    "mkUnsafePulseWireOR" : {
        "type" : "module",
        "info" : `Returns a PulseWire which acts like a logical "Or". The send method of the same wire can be used in two dierent rules without confiict. The send and _read methods can be in the same rule.`,
        "proto" : `module mkUnsafePulseWire(PulseWire);`,
        "package" : "Prelude",
    },

    "ReadOnly" : {
        "type" : "class",
        "info" : `ReadOnly is an interface which provides a value. The _read shorthand can be used to read the value.`,
        "proto" : `
        interface ReadOnly #( type a_type ) ;
            method a_type _read() ;
        endinterface`,
         "super" : [
        ],
        "methods" : {
            "_read" : {
                "type"  : "method",
                "proto" : `method a_type _read() ;`,
                "info"  : `Reads the data`,
            },
        }
    },
    "regToReadOnly" : {
        "type" : "function",
        "info" : `Converts a Reg interface into a ReadOnly interface. Useful for giving as the argument to higher-order vector and list functions.`,
        "proto" : `function ReadOnly#(a_type) regToReadOnly(Reg#(a_type) regIfc);`,
        "package" : "Prelude",
    },
    "pulseWireToReadOnly" : {
        "type" : "function",
        "info" : `Converts a PulseWire interface into a ReadOnly interface.`,
        "proto" : `function ReadOnly#(Bool) pulseWireToReadOnly(PulseWire ifc);`,
        "package" : "Prelude",
    },
    "readReadOnly" : {
        "type" : "function",
        "info" : `Takes a ReadOnly interface and returns a value`,
        "proto" : `function a_type readReadOnly(ReadOnly#(a_type) r);`,
        "package" : "Prelude",
    },
    "WriteOnly" : {
        "type" : "class",
        "info" : `WriteOnly is an interface which writes a value. The _write shorthand is used to write the value.`,
        "proto" : `
        interface WriteOnly #( type a_type ) ;
            method Action _write (a_type x) ;
        endinterface`,
         "super" : [
        ],
        "methods" : {
            "_write" : {
                "proto" : `method Action _write (a_type x) ;`,
                "info"  : `Writes the data`,
            },
        }
    },


    // Miscellaneous Functions
    "error" : {
        "type" : "function",
        "info" : `Generate a compile-time error message, s, and halt compilation.`,
        "proto" : `function a_type error(String s);`,
        "package" : "Prelude",
    },
    "warning" : {
        "type" : "function",
        "info" : `When applied to a value v of type a, generate a compile-time warning message, s, and continue compilation, returning v.`,
        "proto" : `function a_type warning(String s, a_type v);`,
        "package" : "Prelude",
    },
    "message" : {
        "type" : "function",
        "info" : `When applied to a value v of type a, generate a compile-time informative message, s, and continue compilation, returning v.`,
        "proto" : `function a_type message(String s, a_type v);`,
        "package" : "Prelude",
    },
    "errorM" : {
        "type" : "function",
        "info" : `Generate a compile-time error message, s, and halt compilation in a monad.`,
        "proto" : `function m#(void) errorM(String s) provisos (Monad#(m));`,
        "package" : "Prelude",
    },
    "warningM" : {
        "type" : "function",
        "info" : `Generate a compilation warning in a monad.`,
        "proto" : `function m#(void) warningM(String s) provisos (Monad#(m));`,
        "package" : "Prelude",
    },
    "messageM" : {
        "type" : "function",
        "info" : `Generate a compilation message in a monad.`,
        "proto" : `function m#(void) messageM(String s) provisos (Monad#(m));`,
        "package" : "Prelude",
    },
    "signedMul" : {
        "type" : "function",
        "info" : `Performs full precision multiplication on two Int#(n) operands of different sizes.`,
        "proto" : `function Int#(m) signedMul(Int#(n) x, Int#(k) y) provisos (Add#(n,k,m));`,
        "package" : "Prelude",
    },
    "unsignedMul" : {
        "type" : "function",
        "info" : `Performs full precision multiplication on two unsigned UInt#(n) operands of different sizes.`,
        "proto" : `function UInt#(m) unsignedMul(UInt#(n) x, UInt#(k) y) provisos (Add#(n,k,m));`
    },
    "signedQuot" : {
        "type" : "function",
        "info" : `Performs full precision division on two Int#(n) operands of dierent sizes.`,
        "proto" : `function Int#(m) signedQuot(Int#(n) x, Int#(k) y) ;`,
        "package" : "Prelude",
    },
    "unsignedQuot" : {
        "type" : "function",
        "info" : `Performs full precision division on two unsigned UInt#(n) operands of different sizes.`,
        "proto" : `function UInt#(m) unsignedQuot(UInt#(n) x, UInt#(k) y) ;`,
        "package" : "Prelude",
    },
    "compose" : {
        "type" : "function",
        "info" : `Creates a new function, c, made up of functions, f and g. That is, c(a) = f(g(a))`,
        "proto" : `function (function c_type (a_type x0)) compose(function c_type f(b_type x1), function b_type g(a_type x2));`,
        "package" : "Prelude",
    },
    "composeM" : {
        "type" : "function",
        "info" : `Creates a new monadic function, m#(c), made up of functions, f and g. That is, c(a) = f(g(a))`,
        "proto" : `function (function m#(c_type) (a_type x0)) composeM(function m#(c_type) f(b_type x1), function m#(b_type) g(a_type x2)) provisos # (Monad#(m));`,
        "package" : "Prelude",
    },
    "id" : {
        "type" : "function",
        "info" : `Identity function, returns x when given x. This function is useful when the argument requires a function which doesn't do anything.`,
        "proto" : `function a_type id(a_type x);`,
        "package" : "Prelude",
    },
    "constFn" : {
        "type" : "function",
        "info" : `Constant function, returns x.`,
        "proto" : `function a_type constFn(a_type x, b_type y);`,
        "package" : "Prelude",
    },
    "flip" : {
        "type" : "function",
        "info" : `Flips the arguments x and y, returning a new function.`,
        "proto" : `function (function c_type new (b_type y, a_type x)) flip (function c_type old (a_type x, b_type y));`,
        "package" : "Prelude",
    },
    "curry" : {
        "type" : "function",
        "info" : `This function converts a function on a pair (Tuple2) of arguments into a function which takes the arguments separately. The phrase t0 f(t1 x, t2 y) is the function returned by curry the arguments x and y, returning a new function.`,
        "proto" : `function (function t0 f(t1 x, t2 y)) curry (function t0 g(Tuple2#(t1, t2) x));`,
        "package" : "Prelude",
    },
    "uncurry" : {
        "type" : "function",
        "info" : `This function does the reverse of curry; it converts a function of two arguments into a function which takes a single argument, a pair (Tuple2).`,
        "proto" : `function (function t0 g(Tuple2#(t1, t2) x)) uncurry (function t0 f(t1 x, t2 y)); `
    },
    "parity" : {
        "type" : "function",
        "info" : `Returns the parity of the bit argument v. Example: parity( 5'b1) = 1, parity( 5'b3) = 0;`,
        "proto" : `function Bit#(1) parity(Bit#(n) v); `,
        "package" : "Prelude",
    },
    "reverseBits" : {
        "type" : "function",
        "info" : `Reverses the order of the bits in the argument x.`,
        "proto" : `function Bit#(n) reverseBits(Bit#(n) x);`,
        "package" : "Prelude",
    },
    "countOnes" : {
        "type" : "function",
        "info" : `Returns the count of the number of 1's in the bit vector bin.`,
        "proto" : `function UInt#(lgn1) countOnes ( Bit#(n) bin ) provisos (Add#(1, n, n1), Log#(n1, lgn1), Add#(1, xx, lgn1) );`,
        "package" : "Prelude",
    },
    "countZerosMSB" : {
        "type" : "function",
        "info" : `For the bit vector bin, count the number of 0s until the first 1, starting from the most significant bit (MSB).`,
        "proto" : `function UInt#(lgn1) countZerosMSB ( Bit#(n) bin ) provisos (Add#(1, n, n1), Log#(n1, lgn1) );`,
        "package" : "Prelude",
    },
    "countZerosLSB" : {
        "type" : "function",
        "info" : `For the bit vector bin, count the number of 0s until the first 1, starting from the least significant bit (LSB).`,
        "proto" : `function UInt#(lgn1) countZerosLSB ( Bit#(n) bin ) provisos (Add#(1, n, n1), Log#(n1, lgn1) );`,
        "package" : "Prelude",
    },
    "truncateLSB" : {
        "type" : "function",
        "info" : `Truncates a Bit#(m) to a Bit#(n) by dropping bits starting with the LSB.`,
        "proto" : `function Bit#(n) truncateLSB(Bit#(m) x) provisos(Add#(n,k,m));`,
        "package" : "Prelude",
    },
    "gcd" : {
        "type" : "function",
        "info" : `Calculate the greatest common divisor of two Integers.`,
        "proto" : `function Integer gcd(Integer a, Integer b);`,
        "package" : "Prelude",
    },
    "lcm" : {
        "type" : "function",
        "info" : `Calculate the least common multiple of two Integers.`,
        "proto" : `function Integer lcm(Integer a, Integer b);`,
        "package" : "Prelude",
    },
    "while" : {
        "type" : "function",
        "info" : `Repeat a function while a predicate holds.`,
        "proto" : `function a_type while(function Bool pred(a_type x1), function a_type f(a_type x1), a_type x);`,
        "package" : "Prelude",
    },
    "when" : {
        "type" : "function",
        "info" : `Adds an implicit condition onto an expression.`,
        "proto" : `function a when(Bool condition, a arg);`,
        "package" : "Prelude",
    },
    "genC" : {
        "type" : "function",
        "info" : `Returns True if the compiler is generating C.`,
        "proto" : `function Bool genC();`,
        "package" : "Prelude",
    },
    "genVerilog" : {
        "type" : "function",
        "info" : `Returns True if the compiler is generating Verilog.`,
        "proto" : `function Bool genVerilog();`,
        "package" : "Prelude",
    },
    "genPackageName" : {
        "type" : "function",
        "info" : `Returns a String containing the name of the package being compiled.`,
        "proto" : `function String genPackageName;`,
        "package" : "Prelude",
    },
    "genModuleName" : {
        "type" : "function",
        "info" : `Returns a String containing the name of the module being synthesized.`,
        "proto" : `function String genModuleName;`,
        "package" : "Prelude",
    },
    "compilerVersion" : {
        "type" : "function",
        "info" : `Returns a String containing the compiler version. This is the same string used with the -v flag.`,
        "proto" : `String compilerVersion;`,
        "package" : "Prelude",
    },
    "buildVersion" : {
        "type" : "function",
        "info" : `Returns a Bit#(32) containing the build number portion of the compiler version.`,
        "proto" : `Bit#(32) buildVersion;`,
        "package" : "Prelude",
    },
    "date" : {
        "type" : "function",
        "info" : `Returns a String containing the date.`,
        "proto" : `String date;`,
        "package" : "Prelude",
    },
    "epochTime" : {
        "type" : "function",
        "info" : `Returns a Bit#(32) containing the number of seconds since the epoch, which is defined as 1970-01-01 00:00:00.`,
        "proto" : `Bit#(32) epochTime;`,
        "package" : "Prelude",
    },
    "openFile" : {
        "type" : "module",
        "info" : `Opens a file and returns the type Handle`,
        "proto" : `module openFile #(String filename, IOMode mode) (Handle);`,
        "package" : "Prelude",
    },
    "hClose" : {
        "type" : "module",
        "info" : `Closes the file with the specified handle.`,
        "proto" : `module hClose #(Handle hdl) ();`,
        "package" : "Prelude",
    },
    "hIsEOF" : {
        "type" : "function",
        "info" : `Returns a Bool indicating if the end of file has been reached for the specified handle.`,
        "proto" : `function Bool hIsEOF (Handle hdl);`,
        "package" : "Prelude",
    },
    "hIsOpen" : {
        "type" : "function",
        "info" : `Returns true if the the handle hdl is open.`,
        "proto" : `function Bool hIsOpen (Handle hdl);`,
        "package" : "Prelude",
    },
    "hIsClosed" : {
        "type" : "function",
        "info" : `Returns true if the handle hdl is closed.`,
        "proto" : `function Bool hIsClosed (Handle hdl);`,
        "package" : "Prelude",
    },
    "hIsReadable" : {
        "type" : "function",
        "info" : `Returns true if the handle has been opened in Readable mode and can be read from.`,
        "proto" : `function Bool hIsReadable (Handle hdl);`,
        "package" : "Prelude",
    },
    "hIsWriteable" : {
        "type" : "function",
        "info" : `Returns true if handle has been opened in Writeable mode and can be written to.`,
        "proto" : `function Bool hIsWriteable (Handle hdl);`,
        "package" : "Prelude",
    },
    "hFlush" : {
        "type" : "function",
        "info" : `Explicitly flushes the buffer with the specified handle.`,
        "proto" : `function Action hFlush(Handle hdl);`,
        "package" : "Prelude",
    },
    "hGetBuffering" : {
        "type" : "function",
        "info" : `Returns the bufering policy of the file with the specified handle.`,
        "proto" : `function ActionValue#(BufferMode) hGetBuffering(Handle hdl);`,
        "package" : "Prelude",
    },
    "hSetBuffering" : {
        "type" : "function",
        "info" : `Sets the buffering mode for the file with the specified handle if the file system supports it.`,
        "proto" : `function Action hSetBuffering(Handle hdl, BufferMode mode);`,
        "package" : "Prelude",
    },
    "hPutStr" : {
        "type" : "module",
        "info" : `Writes the string to the file with the specified handle.`,
        "proto" : `module hPutStr #(Handle hdl, String str) ();`,
        "package" : "Prelude",
    },
    "hPutStrLn" : {
        "type" : "module",
        "info" : `Writes the string to the file with the specified handle and appends a newline to the end of the string.`,
        "proto" : `module hPutStrLn #(Handle hdl, String str) ();`,
        "package" : "Prelude",
    },
    "hPutChar" : {
        "type" : "module",
        "info" : `Writes the character to the file with the specified handle.`,
        "proto" : `module hPutChar #(Handle hdl, Char c) ();`
    },
    "hGetChar" : {
        "type" : "module",
        "info" : `Reads the character from the file with the specified handle.`,
        "proto" : `module hGetChar #(Handle hdl) (Char);`,
        "package" : "Prelude",
    },
    "hGetLine" : {
        "type" : "module",
        "info" : `Reads a line from the file with the specified handle.`,
        "proto" : `module hGetLine #(Handle hdl) (String);`,
        "package" : "Prelude",
    },
};

class BsvWorkspaceInfoProvider implements BsvInfoProvider{
    constructor(path:Uri){

    }
    
    getSymbol(doc : TextDocument): DocumentSymbol[] | SymbolInformation[] {
        throw new Error('Method not implemented.');
    }
}

class BsvSingleFileInfoProvider implements BsvInfoProvider{
    getSymbol(doc : TextDocument): DocumentSymbol[] | SymbolInformation[] {
        throw new Error('Method not implemented.');
    }

}


export class BsvInfoProviderManger{
    provider : BsvInfoProvider;
    static self : BsvInfoProviderManger;
    
    static getInstance() : BsvInfoProviderManger{
        if(!this.self){
            this.self = new BsvInfoProviderManger();
        }
        return this.self;
    }

    getProvider() : BsvInfoProvider{
        if(!this.provider){
            throw new Error("provider not exist");
        }
        return this.provider;
    }

    onWorkspace() : Boolean{
        return true;
    }

    protected refreshWorkspace(){
        if(!workspace.workspaceFolders){
            this.provider = new BsvSingleFileInfoProvider();
        } else if(workspace.workspaceFolders.length>1){
            window.showInformationMessage("bsv only support one opened workspace now")
        } else if(workspace.workspaceFolders.length == 1){
            this.provider = new  BsvWorkspaceInfoProvider(workspace.workspaceFolders[0].uri)
        } else if(workspace.workspaceFolders.length == 0){
            this.provider = new BsvSingleFileInfoProvider();
        }
    }
}



