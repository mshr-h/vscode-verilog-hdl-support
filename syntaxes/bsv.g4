grammar bsv;

// meta: [] - optional {} - zero or more

BlockComment
    :   '/*' .*? '*/'
        -> skip
    ;

LineComment
    :   '//' ~[\r\n]*
        -> skip
    ;


Whitespace
    :   [ \t]+
        -> skip
    ;

Newline
    :   (   '\r' '\n'?
        |   '\n'
        )
        -> skip
    ;


// string literals
fragment
CharacterConstant
    :   '\'' CCharSequence '\'';

fragment
CCharSequence
    :   CChar+
    ;

fragment
CChar
    :   ~['\\\r\n]
    |   EscapeSequence
    ;

fragment
EscapeSequence
    :   SimpleEscapeSequence
    |   OctalEscapeSequence
    |   HexadecimalEscapeSequence
    ;

fragment
SimpleEscapeSequence
    :   '\\' ['"abfnrtv\\]
    ;
fragment
OctalEscapeSequence
    :   '\\' OctalDigit OctalDigit? OctalDigit?
    ;
fragment
HexadecimalEscapeSequence
    :   '\\x' HexadecimalDigit+
    ;

StringLiteral
    :   '"' SCharSequence? '"'
    ;

fragment
SChar
    :   ~["\\\r\n]
    |   EscapeSequence
    |   '\\\n'   // Added line
    |   '\\\r\n' // Added line
    ;

fragment
HexadecimalDigit
    :   [0-9a-fA-F]
    ;


fragment
OctalDigit
    :   [0-7]
    ;

fragment
SCharSequence
    :   SChar+
    ;


// id

fragment
Digit
    :   [0-9]
    ;

Identifier
    :   IdentifierNondigit
        (   IdentifierNondigit
        |   Digit
        )+
    ;

fragment
FileName
    :   
        (   IdentifierNondigit
        |   Digit
        )+
    ;

fragment
IdentifierNondigit
    :   Nondigit
    ;


fragment
Nondigit
    :   [a-zA-Z_$]
    ;


identifier : Identifier;
// Integer literals
intLiteral  :   '\'0' | '\'1'
            |   sizedIntLiteral
            |   unsizedIntLiteral;

sizedIntLiteral :  bitWidth baseLiteral;

unsizedIntLiteral   :  sign? baseLiteral
                    |   sign? decNum;


baseLiteral :   ('\'d' | '\'D') decDigitsUnderscore
            |   ('\'h' | '\'H') hexDigitsUnderscore
            |   ('\'o' | '\'O') octDigitsUnderscore
            |   ('\'b' | '\'B') binDigitsUnderscore;


decNum      :  decDigits decDigitsUnderscore?;
bitWidth    :  decDigits;
sign        :  '+' | '-';

Digit_      :  Digit+;
decDigits   :  Digit_;
fragment
DecDigitsUnderscore     :  [0-9_];
DecDigitsUnderscore_    :  DecDigitsUnderscore+;
decDigitsUnderscore     :  DecDigitsUnderscore_;
fragment
HexDigitsUnderscore     :  [0-9a-fA-F_];
HexDigitsUnderscore_    :  HexDigitsUnderscore+;
hexDigitsUnderscore     :  HexDigitsUnderscore_;
fragment
OctDigitsUnderscore     :  [0-7_]; 
OctDigitsUnderscore_    :  OctDigitsUnderscore+;
octDigitsUnderscore     :  OctDigitsUnderscore_;
fragment
BinDigitsUnderscore     :  [01_];
BinDigitsUnderscore_    :  BinDigitsUnderscore+;
binDigitsUnderscore     :  BinDigitsUnderscore_;

//  Real literals

realLiteral : decNum('.'decDigitsUnderscore)? exp sign? decDigitsUnderscore
            | decNum'.'decDigitsUnderscore;

exp         : 'e' | 'E';

//  String literals
stringLiteral : StringLiteral;

//  Compiler directives

CompilerDirective   : ('`include' Whitespace* StringLiteral
                    | '`include' Whitespace* '<' Whitespace* FileName Whitespace* '>'
                    | '`include' MacroInvocation
                    | '`line' Whitespace* LineNumber Whitespace* '"' Whitespace* FileName Whitespace* '"' Whitespace* Level
                    | '`undef' Whitespace* MacroName
                    | '`resetall'
                    | '`ifdef' Whitespace* MacroName
                    | '`ifndef' Whitespace* MacroName
                    | '`elsif' Whitespace* MacroName
                    | '`endif' Whitespace* MacroName 
                    ) -> skip;


LineNumber  : Digit_;
Level       : '0' | '1' | '2';
MacroName   : Identifier;
MacroFormals: Identifier;
 
fragment
MacroInvocation_ : '\''MacroName('('MacroActuals')')?;

MacroInvocation : MacroInvocation_;
fragment
MacroActuals    : SubstText (',' SubstText)*;
fragment
SubstText       : .*?;

// Packages and the outermost structure of a BSV design


top           :  exportDecl*
              |  importDecl*
              |  packageStmt*
              |  r_package*;
r_package     : 'package' packageIde ';'
              exportDecl*
              importDecl*
              packageStmt*
              'endpackage' (':'packageIde)? ;

non_package : exportDecl*
            | importDecl*
            | packageStmt*;

exportDecl  : 'export' exportItem (',' exportItem)* ';';
exportItem  : identifier '(..)'?
            | Identifier '(..)'?
            | packageIde '::' '*';

importDecl  : 'import' importItem (',' importItem)* ';';
importItem  : packageIde '::' '*';
packageStmt : moduleDef
            | interfaceDecl
            | typeDef
            | varDecl
            | varAssign
            | functionDef
            | typeclassDef
            | typeclassInstanceDef
            | externModuleImport;

packageIde  : Identifier;

//  Types
type        : typePrimary
            | typePrimary '(' type (',' type)* ')';

typePrimary : typeIde ('#' '(' type  (',' type)* ')')?
            | typeNat
            | 'bit' '[' typeNat ':' typeNat ']';

typeIde     : Identifier;
typeNat     : decDigits;



// Interface declaration

interfaceDecl   : ( attributeInstances )?
                  'interface' typeDefType ';'
                  '{' interfaceMemberDecl '}'
                  'endinterface'  (':' typeIde)? ;

typeDefType     : typeIde typeFormals?;
typeFormals     : '#' '(' typeFormal (',' typeFormal)* ')';
typeFormal      : 'numeric'? type typeIde;

interfaceMemberDecl : methodProto | subinterfaceDecl;
methodProto         : attributeInstances?
                      'method' type identifier '(' methodProtoFormals? ')' ';';

methodProtoFormals  : methodProtoFormal ( ',' methodProtoFormal);
methodProtoFormal   : attributeInstances? type identifier;

// Subinterfaces
subinterfaceDecl    : attributeInstances?
                      'interface' typeDefType ';';

// Module definition

moduleDef   : attributeInstances?
              moduleProto
              (moduleStmt)*
              'endmodule' (':' identifier);

moduleProto : 'module' ('[' type ']')? identifier
              moduleFormalParams? '(' moduleFormalArgs? ')' provisos? ';';

moduleFormalParams  : '#' '(' moduleFormalParam (',' moduleFormalParam)* ')' ;
moduleFormalParam   : attributeInstances? 'parameter'? type identifier;
moduleFormalArgs    : attributeInstances? type
                    | attributeInstances? type identifier
                      ( ','  attributeInstances? type identifier);

moduleStmt  : moduleInst
            | methodDef
            | subinterfaceDef
            | r_rule
            | (varDo | varDeclDo)
            | functionCall
            | systemTaskStmt
            | '(' expression ')'
            | returnStmt
            | varDecl | varAssign
            | functionDef
            | moduleDef
            | beginEndStmt_moduleStmt
            | if_moduleStmt
            | case_moduleStmt
            | for_moduleStmt
            | while_moduleStmt
            ;


// Module and interface instantiation
moduleInst      : attributeInstances?
                  type identifier '<-' moduleApp ';'
                | attributeInstances?
                  type identifier '(' ')' ';'
                  moduleApp2 identifier '(' moduleActualArgs? ')' ';' ;

moduleApp       : identifier
                  '(' (moduleActualParamArg ( ',' moduleActualParamArg)*)* ')';

moduleActualParamArg    : expression
                        | 'clocked_by' expression
                        | 'reset_by' expression;

moduleApp2      : identifier ( '#' '(' moduleActualParam (',' moduleActualParam)* ')')?;
moduleActualParam   : expression;
moduleActualArgs    : moduleActualArg (',' moduleActualArg)*;
moduleActualArg     : expression
                    | 'clocked_by' expression
                    | 'reset_by' expression;

// Interface
methodDef           : 'method' type? identifier '(' methodProtoFormals ')' implicitCond? ';'
                      functionBody
                      'endmethod' (':' identifier)
                    | 'method' 'Action' identifier '(' methodFormals ')' implicitCond? ';'
                      actionStmt*
                      'endmethod' (':' identifier)
                    | 'method' 'ActionValue' '#' '(' type ')' identifier  '(' methodFormals ')' (implicitCond ';')?
                      actionValueStmt*
                      'endmethod' (':' identifier)
                    | 'method' type? identifier '(' methodFormals ')' implicitCond?
                        '=' expression ';' ;

implicitCond        : 'if' '(' condPredicate ')' ;
methodFormals       : methodFormal (',' methodFormal)*;
methodFormal        : type? identifier;

// subinterfaces
subinterfaceDef     : 'interface' Identifier identifier
                      interfaceStmt*
                      'endinterface' (':' identifier)
                    | 'interface' type? identifier '=' expression ';' ;

interfaceStmt       : methodDef
                    | subinterfaceDef
                    | expressionStmt;

expressionStmt      : varDecl | varAssign
                    | functionDef
                    | moduleDef
                    | beginEndStmt_expressionStmt
                    | if_expressionStmt
                    | case_expressionStmt
                    | for_expressionStmt
                    | while_expressionStmt;

// Rules in module definitions

r_rule              : attributeInstances?
                      'rule' identifier ruleCond? ';'
                        ruleBody
                      'endrule' ( ':' identifier)? ;

ruleCond            : '(' condPredicate ')';
ruleBody            : actionStmt*;

// User-defined types

typeDef             : typedefSynonym
                    | typedefEnum
                    | typedefStruct
                    | typedefTaggedUnion;

typedefSynonym      : 'typedef' type typeDefType ';';
typedefEnum         : 'typedef' 'enum' '{' typedefEnumElements '}' Identifier derives? ';' ;
typedefEnumElements : typedefEnumElement (',' typedefEnumElement)*;
typedefEnumElement  : Identifier ('=' intLiteral)?
                    | Identifier '[' intLiteral ']' ('=' intLiteral)?
                    | Identifier '[' intLiteral ':' intLiteral ']' ('=' intLiteral)?;

typedefStruct       : 'typedef' 'struct' '{'
                        structMember*
                      '}' typeDefType derives? ';';

typedefTaggedUnion  : 'typedef' 'union' 'tagged' '{'
                        unionMember*
                      '}' typeDefType derives? ';';

structMember        : type identifier ';'
                    | subUnion identifier ';';

unionMember         : type Identifier ';'
                    | subStruct Identifier ';'
                    | subUnion Identifier ';'
                    | 'void' Identifier ';';

subStruct           : 'struct' '{'
                        structMember*
                      '}';

subUnion            : 'union' 'tagged' '{'
                        unionMember*
                      '}';


// Variable declarations and statements

// stmt[args]          : moduleDef
//                     | moduleInst
//                     | interfaceDecl
//                     | typeDecf
//                     | methodDef
//                     | rule
//                     | actionBlock;

varDecl             : type varInit ( ',' varInit) ';'
                    | 'let' identifier '=' expression ';';
varInit             : identifier arrayDims? ( '=' expression )?;
arrayDims           : '[' expression ']' ('[' expression ']');


varAssign           : lValue '=' expression ';'
                    | 'let' identifier '<-' expression ';'
                    | 'match' pattern '=' expression ';';

lValue              : identifier
                    | lValue '.' identifier
                    | lValue '[' expression ']'
                    | lValue '[' expression ':' expression ']';

regWrite            : lValue '<=' expression ';'
                    | '(' expression ')' '<=' expression ';'
                    | lValue arrayIndexes '<=' expression ';'
                    | lValue '[' expression ':' expression ']' '<=' expression ';'
                    | lValue '.' identifier '<=' expression ';';


arrayIndexes        : '[' expression ']' ('[' expression ']')*;

// Begin-end statements
beginEndStmt_functionBodyStmt   : 'begin' (':' identifier)?
                                    functionBodyStmt*
                                'end' (':' identifier )?;

beginEndStmt_actionStmt         : 'begin' (':' identifier)?
                                    actionStmt*
                                'end' (':' identifier )?;

beginEndStmt_actionValueStmt    : 'begin' (':' identifier)?
                                    actionValueStmt*
                                'end' (':' identifier )?;

beginEndStmt_moduleStmt         : 'begin' (':' identifier)?
                                    moduleStmt*
                                'end' (':' identifier )?;

beginEndStmt_expressionStmt     : 'begin' (':' identifier)?
                                    expressionStmt*
                                'end' (':' identifier )?;


// beginEndStmt[args]  : 'begin' (':' identifier)?
//                         stmt[args]*
//                       'end' (':' identifier )?;

// Conditional statements
if_functionBodyStmt : 'if' '(' condPredicate ')'
                        functionBodyStmt
                      ( 'else'
                        functionBodyStmt )?;

if_actionStmt       : 'if' '(' condPredicate ')'
                        actionStmt
                      ( 'else'
                        actionStmt )?;

if_actionValueStmt  : 'if' '(' condPredicate ')'
                        actionValueStmt
                      ( 'else'
                        actionValueStmt )?;

if_moduleStmt       : 'if' '(' condPredicate ')'
                        moduleStmt
                      ( 'else'
                        moduleStmt )?;

if_expressionStmt   : 'if' '(' condPredicate ')'
                        expressionStmt
                      ( 'else'
                        expressionStmt )?;

// if[args]            : 'if' '(' condPredicate ')'
//                         stmt[args]
//                       ( 'else'
//                         stmt[args] )?;


// case[args]          : 'case' '(' expression ')'
//                         caseItem[args]*
//                         defaultItem[args]?
//                       'endcase'
//                     | 'case' '(' expression ')' 'matches'
//                         casePatItem[args]*
//                         defaultItem[args]?
//                       'endcase';

case_functionBodyStmt   : 'case' '(' expression ')'
                            caseItem_functionBodyStmt*
                            defaultItem_functionBodyStmt?
                        'endcase'
                        | 'case' '(' expression ')' 'matches'
                            casePatItem_functionBodyStmt*
                            defaultItem_functionBodyStmt?
                        'endcase';

case_actionStmt          : 'case' '(' expression ')'
                            caseItem_actionStmt*
                            defaultItem_actionStmt?
                        'endcase'
                        | 'case' '(' expression ')' 'matches'
                            casePatItem_actionStmt*
                            defaultItem_actionStmt?
                        'endcase';

case_actionValueStmt    : 'case' '(' expression ')'
                            caseItem_actionValueStmt*
                            defaultItem_actionValueStmt?
                        'endcase'
                        | 'case' '(' expression ')' 'matches'
                            casePatItem_actionValueStmt*
                            defaultItem_actionValueStmt?
                        'endcase';

case_moduleStmt         : 'case' '(' expression ')'
                            caseItem_moduleStmt*
                            defaultItem_moduleStmt?
                        'endcase'
                        | 'case' '(' expression ')' 'matches'
                            casePatItem_moduleStmt*
                            defaultItem_moduleStmt?
                        'endcase';

case_expressionStmt     : 'case' '(' expression ')'
                            caseItem_expressionStmt*
                            defaultItem_expressionStmt?
                        'endcase'
                        | 'case' '(' expression ')' 'matches'
                            casePatItem_expressionStmt*
                            defaultItem_expressionStmt?
                        'endcase';

// caseItem[args]      : expression (',' expression) ':' stmt[args];

caseItem_functionBodyStmt       : expression (',' expression) ':' functionBodyStmt;
caseItem_actionStmt             : expression (',' expression) ':' actionStmt;
caseItem_actionValueStmt        : expression (',' expression) ':' actionValueStmt;
caseItem_moduleStmt             : expression (',' expression) ':' moduleStmt;
caseItem_expressionStmt         : expression (',' expression) ':' expressionStmt;

// defaultItem[args]   : 'default' ':'? stmt[args];
defaultItem_functionBodyStmt    : 'default' ':'? functionBodyStmt;
defaultItem_actionStmt          : 'default' ':'? actionStmt;
defaultItem_actionValueStmt     : 'default' ':'? actionValueStmt;
defaultItem_moduleStmt          : 'default' ':'? moduleStmt;
defaultItem_expressionStmt      : 'default' ':'? expressionStmt;

// while loops
// while[args]         : 'while' '(' expression ')'
//                         stmt[args];
while_functionBodyStmt          : 'while' '(' expression ')'
                                    functionBodyStmt;

while_actionStmt                : 'while' '(' expression ')'
                                    actionStmt;

while_actionValueStmt           : 'while' '(' expression ')'
                                    actionValueStmt;

while_moduleStmt                : 'while' '(' expression ')'
                                    moduleStmt;

while_expressionStmt            : 'while' '(' expression ')'
                                    expressionStmt;

// for loops
// for[args]           : 'for' '(' forInit ';' forTest ';' forIncr ')'
//                         stmt[args];
for_functionBodyStmt            : 'for' '(' forInit ';' forTest ';' forIncr ')'
                                    functionBodyStmt;

for_actionStmt                  : 'for' '(' forInit ';' forTest ';' forIncr ')'
                                    actionStmt;

for_actionValueStmt             : 'for' '(' forInit ';' forTest ';' forIncr ')'
                                    actionValueStmt;

for_moduleStmt                  : 'for' '(' forInit ';' forTest ';' forIncr ')'
                                    moduleStmt;

for_expressionStmt              : 'for' '(' forInit ';' forTest ';' forIncr ')'
                                    expressionStmt;



forInit             : forOldInit | forNewInit;
forOldInit          : simpleVarAssign (',' simpleVarAssign)*;
simpleVarAssign     : identifier '=' identifier;
forNewInit          : type identifier '=' expression (',' simpleVarDeclAssign)*;
simpleVarDeclAssign : type? identifier '=' expression;
forTest             : expression;
forIncr             : varIncr (',' varIncr)*;
varIncr             : identifier '=' expression;

// function definitions
functionDef         : attributeInstances?
                      functionProto
                        functionBody
                      'endfunction' (':' identifier);

functionProto       : 'function' type identifier '(' functionFormals? ')' provisos? ';'
                    | 'function' type identifier '(' functionFormals? ')' provisos? '=' expression ';';
functionFormals     : functionFormal (',' functionFormal);
functionFormal      : type identifier;

functionBody        : actionBlock
                    | actionValueBlock
                    | functionBodyStmt*;

functionBodyStmt    : returnStmt
                    | varDecl | varAssign
                    | functionDef
                    | moduleDef
                    | beginEndStmt_functionBodyStmt
                    | if_functionBodyStmt
                    | case_functionBodyStmt
                    | for_functionBodyStmt
                    | while_functionBodyStmt;

returnStmt          : 'return' expression ';';


// expression
expression:
                    expression (
                      '&&&' (expression | (expression 'matches' pattern))
                    )* '?' expression ':' expression//condExpr
                    | expression 'matches' pattern (
                        '&&&' (expression | (expression 'matches' pattern))
                      )* '?' expression ':' expression //condExpr
                    | unop expression
	                  | expression binop expression//operatorExpr
                    | exprPrimary;

exprPrimary         : 'valueof' '(' type ')'
                    | 'valueOf' '(' type ')'
                    | identifier
                    | intLiteral
                    | realLiteral
                    | stringLiteral
                    | systemFunctionCall
                    | '(' expression ')'
                    | '?'
                    | bitConcat
	                  | exprPrimary '[' expression (':' expression)? ']' // | bitSelect
                    | beginEndExpr
                    | actionBlock
                    | actionValueBlock
	                  | exprPrimary ('(' ( expression (',' expression)*)? ')') // | functionCall - we must add () for lexer
                    | exprPrimary '.' identifier ( '(' ( expression (',' expression)*)? ')')// methodCall - we must add () for lexer
                    | typeAssertion
                    | structExpr
                    | exprPrimary '.' identifier
                    | taggedUnionExpr
                    | interfaceExpr
                    | ruleExpr
                    | seqFsmStmt | parFsmStmt
                    ;

condExpr            : condPredicate '?' expression ':' expression;
// condPredicate       : exprOrCondPattern ('&&&' exprOrCondPattern)*;
condPredicate:      (expression | (expression 'matches' pattern)) (
		                  '&&&' (expression | (expression 'matches' pattern)) )*;
exprOrCondPattern   : expression
                    | expression 'matches' pattern;

operatorExpr        : unop expression
                    | expression binop expression;


unop                : '+'
                    | '-'
                    | '!'
                    | '~'
                    | '&'
                    | '~&'
                    | '|'
                    | '~|'
                    | '^'
                    | '^~'
                    | '~^';

binop               : '*'
                    | '/'
                    | '%'
                    | '+'
                    | '-'
                    | '<<'
                    | '>>'
                    | '<='
                    | '>='
                    | '<'
                    | '>'
                    | '=='
                    | '!='
                    | '&'
                    | '^'
                    | '~^'
                    | '^~'
                    | '|'
                    | '&&'
                    | '&&'
                    | '||';

bitConcat           : '{' expression (',' expression)* '}';
// bitSelect           : exprPrimary '[' expression (':' expression)? ']' ;

beginEndExpr        : 'begin' (':' identifier)?
                        expressionStmt*
                        expression
                      'end' (':' identifier)?;

actionBlock         : 'action' (':' identifier)?
                        actionStmt*
                      'endaction' (':' identifier)?;

actionStmt          : regWrite
                    | varDo | varDeclDo
                    | functionCall
                    | systemTaskStmt
                    | '(' expression ')'
                    | varDecl | varAssign
                    | functionDef
                    | moduleDef
                    | beginEndStmt_actionStmt
                    | if_actionStmt
                    | case_actionStmt
                    | for_actionStmt
                    | while_actionStmt;

actionValueBlock    : 'actionvalue'  (':' identifier)?
                        actionValueStmt*
                      'endactionvalue'  (':' identifier)?;
actionValueStmt     : regWrite
                    | varDo | varDeclDo
                    | functionCall
                    | systemFunctionCall
                    | '(' expression ')'
                    | varDecl | varAssign
                    | functionDef
                    | moduleDef
                    | beginEndStmt_actionValueStmt
                    | if_actionValueStmt
                    | case_actionValueStmt
                    | for_actionValueStmt
                    | while_actionValueStmt;

varDeclDo           : type identifier '<-' expression ';';
varDo               : identifier '<-' expression ';';


functionCall        : exprPrimary ('(' ( expression (',' expression)* )? ')')?;
methodCall          : exprPrimary '.' identifier ('(' ( expression (',' expression)* )? ')')?;

typeAssertion       : 'type' '\'' bitConcat
                    | 'type' '\'' '(' expression ')' ;

structExpr          : Identifier '{' memberBind (',' memberBind)* '}';
memberBind          : identifier ':' expression;


taggedUnionExpr     : 'tagged' Identifier '{' memberBind (',' memberBind) '}'
                    | 'tagged' Identifier exprPrimary;


interfaceExpr       : 'interface' Identifier ';'
                      interfaceStmt*
                      'endinterface' (: Identifier) ;

ruleExpr            : attributeInstances?
                      'rules' (':' identifier)?
                         ruleStmt
                      'endrule' (':' identifier)?;

ruleStmt            : r_rule | expressionStmt;

 // Pattern matching
 pattern            : '.' identifier
                    | '.*'
                    | constantPattern
                    | taggedUnionPattern
                    | structPattern
                    | tuplePattern;

constantPattern     : intLiteral
                    | realLiteral
                    | stringLiteral
                    | Identifier;

taggedUnionPattern  : 'tagged' Identifier pattern?;
structPattern       : 'tagged' Identifier '{' identifier ':' pattern (',' identifier ':' pattern)* '}';
tuplePattern        : '{' pattern (',' pattern)* '}';


// casePatItem[args]   : pattern ( '&&&' expression)? ':' stmt[args];
casePatItem_functionBodyStmt   : pattern ( '&&&' expression)? ':' functionBodyStmt;
casePatItem_actionStmt   : pattern ( '&&&' expression)? ':' actionStmt;
casePatItem_actionValueStmt   : pattern ( '&&&' expression)? ':' actionValueStmt;
casePatItem_moduleStmt   : pattern ( '&&&' expression)? ':' moduleStmt;
casePatItem_expressionStmt   : pattern ( '&&&' expression)? ':' expressionStmt;

caseExpr            : 'case' '(' expression ')' 'matches'
                        caseExprItem*
                      'endcase';

caseExprItem        : pattern ('&&&' expression)? ':' expression
                    | 'default' ':'? expression;

// System tasks and functions
systemTaskStmt      : systemTaskCall ';'
                    | displayTaskName '(' (expression (',' expression)*)? ')' ';'
                    | '$format' '(' (expression (',' expression)*)? ')' ';'
                    | '$fopen' '(' expression (',' expression)? ')' ';'
                    | stringTaskName '(' identifier ( ',' expression (',' expression)? )? ')' ';'
                    | 'fgetc' '(' identifier ')' ';'
                    | '$ungetc' '(' expression ',' identifier ')' ';'
                    | '$fflush' '(' identifier? ')' ';'
                    | '$finish' ('(' expression ')')? ';'
                    | '$stop' ('(' expression ')')?
                    | '$dumpvars' ';'
                    | '$dumpon' ';'
                    | '$dumpoff' ';';


displayTaskName     : '$display'
                    | '$displayb'
                    | '$displayo'
                    | '$displayh'
                    | '$write'
                    | '$writeb'
                    | '$writeo'
                    | '$writeh';


stringTaskName      : '$swrite'
                    | '$swriteb'
                    | '$swriteo'
                    | '$swriteh'
                    | '$sformat';

systemFunctionCall  : '$time'
                    | '$stime';

systemTaskCall      : '$realtobits' '(' expression ')'
                    | '$bitstoreal' '(' expression ')'
                    | '$test$plusargs' '(' expression ')';

// attributes
attributeInstances  : attributeInstance attributeInstance*;
attributeInstance   : '(*' attrSpec (',' attrSpec)* '*)';
attrSpec            : attrName ('=' expression)?;
attrName            : identifier | Identifier;

// Type classes (overloading groups) and provisos
provisos            : 'provisos' '(' proviso (',' proviso)* ')';
proviso             : Identifier '#' '(' type (',' type)* ')';


typeclassDef        : 'typeclass' typeclassIde typeFormals provisos?
                      typedepends? ';'
                        overloadedDef*
                      'endtypeclass' (':' Identifier);

typeclassIde        : Identifier;
typelist            : typeIde
                    | '(' typeIde (',' typeIde )* ')';

typedepends         : 'dependencies' '(' typedepend (',' typedepend)* ')';
typedepend          : typelist 'determines' typelist;

overloadedDef       : functionProto
                    | varDecl;

typeclassInstanceDef    : 'instance' typeclassIde '#' '(' type (',' type)* ')' provisos? ';'
                            ( varAssign ';'  | functionDef | moduleDef )*
                          'endinstance' (':' typeclassIde)?;

derives             : 'deriving' '(' typeclassIde (',' typeclassIde)* ')';


// Embedding RTL in a BSV design
externModuleImport  : 'import' '"BVI"' (identifier '=')? moduleProto
                         moduleStmt*
                         importBVIStmt*
                      'endmodule' (':' identifier);

importBVIStmt       : parameterBVIStmt
                    | methodBVIStmt
                    | portBVIStmt
                    | inputClockBVIStmt
                    | defaultClockBVIStmt
                    | outputClockBVIStmt
                    | inputResetBVIStmt
                    | defaultResetBVIStmt
                    | noResetBVIStmt
                    | outputResetBVIStmt
                    | ancestorBVIStmt
                    | sameFamilyBVIStmt
                    | scheduleBVIStmt
                    | pathBVIStmt
                    | interfaceBVIStmt
                    | inoutBVIStmt;

parameterBVIStmt    : 'parameter' identifier '=' expression ';';
methodBVIStmt       : 'method' portId? identifier ('(' portId (',' portId)* ')')?
                        ('enable' '(' portId ')')? ('ready' '(' portId ')')?
                        ('clocked_by' '(' clockId ')')? ('reset_by' '(' resetId ')')? ';' ;
portBVIStmt         : 'port' identifier ('clocked_by' '(' clockId ')')?
                        ('reset_by' '(' resetId ')' )? '=' expression ';' ;

inputClockBVIStmt   : 'input_clock' identifier? '(' portsDef? ')' '=' expression ';' ;
portsDef            : portId (',' attributeInstances? portId)?;
portId              : identifier;

defaultClockBVIStmt : 'default_clock' identifier;
outputClockBVIStmt  : 'output_clock' identifier '(' portsDef? ')' ';';

inputResetBVIStmt   : 'input_reset' identifier? ('(' portId ')')? ('clocked_by' '(' clockId ')')?
                        '=' expression ';' ;
clockId             : identifier;
defaultResetBVIStmt : 'default_reset' identifier ';'
                    | 'default_reset' identifier? ('(' portId ')')? ('clocked_by' '(' clockId ')')?
                        ('=' expression)? ';';

outputResetBVIStmt  : 'output_reset' identifier ('(' portId ')')? ('clocked_by' '(' clockId ')')? ';';
ancestorBVIStmt     : 'ancestor' '(' clockId ',' clockId ')' ';' ;
sameFamilyBVIStmt   : 'same_family' '(' clockId ',' clockId ')' ';' ;
scheduleBVIStmt     : 'schedule' '(' identifier (',' identifier)* ')' operatorId
                        '(' identifier (',' identifier)* ')' ';';
operatorId          : 'CF'
                    | 'SB'
                    | 'SBR'
                    | 'C';

pathBVIStmt         : 'path' '(' portId ',' portId ')' ';';
interfaceBVIStmt    : 'interface' typeDefType ';'
                        interfaceBVIMembDecl*
                      'endinterface' (':' typeIde)? ;

interfaceBVIMembDecl    : methodBVIStmt
                        | interfaceBVIStmt;

inoutBVIStmt        : 'inout' portId ('clocked_by' '(' clockId ')')?
                         ('reset_by' '(' resetId ')')?  '=' expression ';'
                    | 'ifc_inout' identifier '(' portId ')' ('clocked_by' '(' clockId ')')?
                         ('reset_by' '(' resetId ')')?  ';';

resetId             : identifier;
noResetBVIStmt      : 'no_reset' ';' ;


// Embedding C in a BSV Design
externCImport       : 'import' '"BDPI"' (identifier '=')? 'function' type
                        identifier '(' cFuncArgs? ')' provisos? ';';
cFuncArgs           : cFuncArg (',' cFuncArg)*;
cFuncArg            : type identifier?;


// fsm
fsmStmt             : exprFsmStmt
                    | seqFsmStmt
                    | parFsmStmt
                    | ifFsmStmt
                    | whileFsmStmt
                    | repeatFsmStmt
                    | forFsmStmt
                    | returnFsmStmt;

exprFsmStmt         : regWrite ';'
                    | expression ';' ;

seqFsmStmt          : 'seq' fsmStmt fsmStmt* 'endseq';
parFsmStmt          : 'par' fsmStmt fsmStmt* 'endpar';
ifFsmStmt           : 'if' expression fsmStmt
                        ('else' fsmStmt)?;
whileFsmStmt        : 'while' '(' expression ')'
                        loopBodyFsmStmt;
forFsmStmt          : 'for' '(' fsmStmt ';' expression ';' fsmStmt ')'
                        loopBodyFsmStmt;
returnFsmStmt       : 'return' ';';
repeatFsmStmt       : 'repeat' '(' expression ')'
                        loopBodyFsmStmt;
loopBodyFsmStmt     : fsmStmt
                    | 'break' ';'
                    | 'continue' ';' ;
