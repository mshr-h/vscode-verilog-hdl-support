// Generated from syntaxes/bsv.g4 by ANTLR 4.9.0-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";

import { IdentifierContext } from "./bsvParser";
import { Identifier_typeContext } from "./bsvParser";
import { StringLiteralContext } from "./bsvParser";
import { TopContext } from "./bsvParser";
import { R_packageContext } from "./bsvParser";
import { Non_packageContext } from "./bsvParser";
import { ExportDeclContext } from "./bsvParser";
import { ExportItemContext } from "./bsvParser";
import { ImportDeclContext } from "./bsvParser";
import { ImportItemContext } from "./bsvParser";
import { PackageStmtContext } from "./bsvParser";
import { PackageIdeContext } from "./bsvParser";
import { TypeContext } from "./bsvParser";
import { TypePrimaryContext } from "./bsvParser";
import { TypeIdeContext } from "./bsvParser";
import { TypeNatContext } from "./bsvParser";
import { InterfaceDeclContext } from "./bsvParser";
import { TypeDefTypeContext } from "./bsvParser";
import { TypeFormalsContext } from "./bsvParser";
import { TypeFormalContext } from "./bsvParser";
import { InterfaceMemberDeclContext } from "./bsvParser";
import { MethodProtoContext } from "./bsvParser";
import { MethodProtoFormalsContext } from "./bsvParser";
import { MethodProtoFormalContext } from "./bsvParser";
import { SubinterfaceDeclContext } from "./bsvParser";
import { ModuleDefContext } from "./bsvParser";
import { ModuleProtoContext } from "./bsvParser";
import { ModuleFormalParamsContext } from "./bsvParser";
import { ModuleFormalParamContext } from "./bsvParser";
import { ModuleFormalArgsContext } from "./bsvParser";
import { ModuleStmtContext } from "./bsvParser";
import { ModuleInstContext } from "./bsvParser";
import { ModuleAppContext } from "./bsvParser";
import { ModuleActualParamArgContext } from "./bsvParser";
import { ModuleApp2Context } from "./bsvParser";
import { ModuleActualParamContext } from "./bsvParser";
import { ModuleActualArgsContext } from "./bsvParser";
import { ModuleActualArgContext } from "./bsvParser";
import { MethodDefContext } from "./bsvParser";
import { ImplicitCondContext } from "./bsvParser";
import { MethodFormalsContext } from "./bsvParser";
import { MethodFormalContext } from "./bsvParser";
import { SubinterfaceDefContext } from "./bsvParser";
import { InterfaceStmtContext } from "./bsvParser";
import { ExpressionStmtContext } from "./bsvParser";
import { R_ruleContext } from "./bsvParser";
import { RuleCondContext } from "./bsvParser";
import { RuleBodyContext } from "./bsvParser";
import { TypeDefContext } from "./bsvParser";
import { TypedefSynonymContext } from "./bsvParser";
import { TypedefEnumContext } from "./bsvParser";
import { TypedefEnumElementsContext } from "./bsvParser";
import { TypedefEnumElementContext } from "./bsvParser";
import { TypedefStructContext } from "./bsvParser";
import { TypedefTaggedUnionContext } from "./bsvParser";
import { StructMemberContext } from "./bsvParser";
import { UnionMemberContext } from "./bsvParser";
import { SubStructContext } from "./bsvParser";
import { SubUnionContext } from "./bsvParser";
import { VarDeclContext } from "./bsvParser";
import { VarInitContext } from "./bsvParser";
import { ArrayDimsContext } from "./bsvParser";
import { VarAssignContext } from "./bsvParser";
import { LValueContext } from "./bsvParser";
import { RegWriteContext } from "./bsvParser";
import { ArrayIndexesContext } from "./bsvParser";
import { BeginEndStmt_functionBodyStmtContext } from "./bsvParser";
import { BeginEndStmt_actionStmtContext } from "./bsvParser";
import { BeginEndStmt_actionValueStmtContext } from "./bsvParser";
import { BeginEndStmt_moduleStmtContext } from "./bsvParser";
import { BeginEndStmt_expressionStmtContext } from "./bsvParser";
import { If_functionBodyStmtContext } from "./bsvParser";
import { If_actionStmtContext } from "./bsvParser";
import { If_actionValueStmtContext } from "./bsvParser";
import { If_moduleStmtContext } from "./bsvParser";
import { If_expressionStmtContext } from "./bsvParser";
import { Case_functionBodyStmtContext } from "./bsvParser";
import { Case_actionStmtContext } from "./bsvParser";
import { Case_actionValueStmtContext } from "./bsvParser";
import { Case_moduleStmtContext } from "./bsvParser";
import { Case_expressionStmtContext } from "./bsvParser";
import { CaseItem_functionBodyStmtContext } from "./bsvParser";
import { CaseItem_actionStmtContext } from "./bsvParser";
import { CaseItem_actionValueStmtContext } from "./bsvParser";
import { CaseItem_moduleStmtContext } from "./bsvParser";
import { CaseItem_expressionStmtContext } from "./bsvParser";
import { DefaultItem_functionBodyStmtContext } from "./bsvParser";
import { DefaultItem_actionStmtContext } from "./bsvParser";
import { DefaultItem_actionValueStmtContext } from "./bsvParser";
import { DefaultItem_moduleStmtContext } from "./bsvParser";
import { DefaultItem_expressionStmtContext } from "./bsvParser";
import { While_functionBodyStmtContext } from "./bsvParser";
import { While_actionStmtContext } from "./bsvParser";
import { While_actionValueStmtContext } from "./bsvParser";
import { While_moduleStmtContext } from "./bsvParser";
import { While_expressionStmtContext } from "./bsvParser";
import { For_functionBodyStmtContext } from "./bsvParser";
import { For_actionStmtContext } from "./bsvParser";
import { For_actionValueStmtContext } from "./bsvParser";
import { For_moduleStmtContext } from "./bsvParser";
import { For_expressionStmtContext } from "./bsvParser";
import { ForInitContext } from "./bsvParser";
import { ForOldInitContext } from "./bsvParser";
import { SimpleVarAssignContext } from "./bsvParser";
import { ForNewInitContext } from "./bsvParser";
import { SimpleVarDeclAssignContext } from "./bsvParser";
import { ForTestContext } from "./bsvParser";
import { ForIncrContext } from "./bsvParser";
import { VarIncrContext } from "./bsvParser";
import { FunctionDefContext } from "./bsvParser";
import { FunctionProtoContext } from "./bsvParser";
import { FunctionFormalsContext } from "./bsvParser";
import { FunctionFormalContext } from "./bsvParser";
import { FunctionBodyContext } from "./bsvParser";
import { FunctionBodyStmtContext } from "./bsvParser";
import { ReturnStmtContext } from "./bsvParser";
import { ExpressionContext } from "./bsvParser";
import { ExprPrimaryContext } from "./bsvParser";
import { CondExprContext } from "./bsvParser";
import { CondPredicateContext } from "./bsvParser";
import { ExprOrCondPatternContext } from "./bsvParser";
import { OperatorExprContext } from "./bsvParser";
import { UnopContext } from "./bsvParser";
import { BinopContext } from "./bsvParser";
import { BitConcatContext } from "./bsvParser";
import { BeginEndExprContext } from "./bsvParser";
import { ActionBlockContext } from "./bsvParser";
import { ActionStmtContext } from "./bsvParser";
import { ActionValueBlockContext } from "./bsvParser";
import { ActionValueStmtContext } from "./bsvParser";
import { VarDeclDoContext } from "./bsvParser";
import { VarDoContext } from "./bsvParser";
import { FunctionCallContext } from "./bsvParser";
import { MethodCallContext } from "./bsvParser";
import { TypeAssertionContext } from "./bsvParser";
import { StructExprContext } from "./bsvParser";
import { MemberBindContext } from "./bsvParser";
import { TaggedUnionExprContext } from "./bsvParser";
import { InterfaceExprContext } from "./bsvParser";
import { RuleExprContext } from "./bsvParser";
import { RuleStmtContext } from "./bsvParser";
import { PatternContext } from "./bsvParser";
import { ConstantPatternContext } from "./bsvParser";
import { TaggedUnionPatternContext } from "./bsvParser";
import { StructPatternContext } from "./bsvParser";
import { TuplePatternContext } from "./bsvParser";
import { CasePatItem_functionBodyStmtContext } from "./bsvParser";
import { CasePatItem_actionStmtContext } from "./bsvParser";
import { CasePatItem_actionValueStmtContext } from "./bsvParser";
import { CasePatItem_moduleStmtContext } from "./bsvParser";
import { CasePatItem_expressionStmtContext } from "./bsvParser";
import { CaseExprContext } from "./bsvParser";
import { CaseExprItemContext } from "./bsvParser";
import { SystemTaskStmtContext } from "./bsvParser";
import { DisplayTaskNameContext } from "./bsvParser";
import { StringTaskNameContext } from "./bsvParser";
import { SystemFunctionCallContext } from "./bsvParser";
import { SystemTaskCallContext } from "./bsvParser";
import { StringAVTaskNameContext } from "./bsvParser";
import { AttributeInstancesContext } from "./bsvParser";
import { AttributeInstanceContext } from "./bsvParser";
import { AttrSpecContext } from "./bsvParser";
import { AttrNameContext } from "./bsvParser";
import { ProvisosContext } from "./bsvParser";
import { ProvisoContext } from "./bsvParser";
import { TypeclassDefContext } from "./bsvParser";
import { TypeclassIdeContext } from "./bsvParser";
import { TypelistContext } from "./bsvParser";
import { TypedependsContext } from "./bsvParser";
import { TypedependContext } from "./bsvParser";
import { OverloadedDefContext } from "./bsvParser";
import { TypeclassInstanceDefContext } from "./bsvParser";
import { DerivesContext } from "./bsvParser";
import { ExternModuleImportContext } from "./bsvParser";
import { ImportBVIStmtContext } from "./bsvParser";
import { Enabled_selContext } from "./bsvParser";
import { Ready_selContext } from "./bsvParser";
import { Clocked_by_selContext } from "./bsvParser";
import { Reset_by_selContext } from "./bsvParser";
import { ParameterBVIStmtContext } from "./bsvParser";
import { MethodBVIStmtContext } from "./bsvParser";
import { PortBVIStmtContext } from "./bsvParser";
import { InputClockBVIStmtContext } from "./bsvParser";
import { PortsDefContext } from "./bsvParser";
import { PortIdContext } from "./bsvParser";
import { DefaultClockBVIStmtContext } from "./bsvParser";
import { OutputClockBVIStmtContext } from "./bsvParser";
import { InputResetBVIStmtContext } from "./bsvParser";
import { ClockIdContext } from "./bsvParser";
import { DefaultResetBVIStmtContext } from "./bsvParser";
import { OutputResetBVIStmtContext } from "./bsvParser";
import { AncestorBVIStmtContext } from "./bsvParser";
import { SameFamilyBVIStmtContext } from "./bsvParser";
import { ScheduleBVIStmtContext } from "./bsvParser";
import { OperatorIdContext } from "./bsvParser";
import { PathBVIStmtContext } from "./bsvParser";
import { InterfaceBVIStmtContext } from "./bsvParser";
import { InterfaceBVIMembDeclContext } from "./bsvParser";
import { InoutBVIStmtContext } from "./bsvParser";
import { ResetIdContext } from "./bsvParser";
import { NoResetBVIStmtContext } from "./bsvParser";
import { ExternCImportContext } from "./bsvParser";
import { CFuncArgsContext } from "./bsvParser";
import { CFuncArgContext } from "./bsvParser";
import { FsmStmtContext } from "./bsvParser";
import { ExprFsmStmtContext } from "./bsvParser";
import { SeqFsmStmtContext } from "./bsvParser";
import { ParFsmStmtContext } from "./bsvParser";
import { IfFsmStmtContext } from "./bsvParser";
import { WhileFsmStmtContext } from "./bsvParser";
import { ForFsmStmtContext } from "./bsvParser";
import { ReturnFsmStmtContext } from "./bsvParser";
import { RepeatFsmStmtContext } from "./bsvParser";
import { LoopBodyFsmStmtContext } from "./bsvParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `bsvParser`.
 */
export interface bsvListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `bsvParser.identifier`.
	 * @param ctx the parse tree
	 */
	enterIdentifier?: (ctx: IdentifierContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.identifier`.
	 * @param ctx the parse tree
	 */
	exitIdentifier?: (ctx: IdentifierContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.identifier_type`.
	 * @param ctx the parse tree
	 */
	enterIdentifier_type?: (ctx: Identifier_typeContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.identifier_type`.
	 * @param ctx the parse tree
	 */
	exitIdentifier_type?: (ctx: Identifier_typeContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.stringLiteral`.
	 * @param ctx the parse tree
	 */
	enterStringLiteral?: (ctx: StringLiteralContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.stringLiteral`.
	 * @param ctx the parse tree
	 */
	exitStringLiteral?: (ctx: StringLiteralContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.top`.
	 * @param ctx the parse tree
	 */
	enterTop?: (ctx: TopContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.top`.
	 * @param ctx the parse tree
	 */
	exitTop?: (ctx: TopContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.r_package`.
	 * @param ctx the parse tree
	 */
	enterR_package?: (ctx: R_packageContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.r_package`.
	 * @param ctx the parse tree
	 */
	exitR_package?: (ctx: R_packageContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.non_package`.
	 * @param ctx the parse tree
	 */
	enterNon_package?: (ctx: Non_packageContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.non_package`.
	 * @param ctx the parse tree
	 */
	exitNon_package?: (ctx: Non_packageContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.exportDecl`.
	 * @param ctx the parse tree
	 */
	enterExportDecl?: (ctx: ExportDeclContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.exportDecl`.
	 * @param ctx the parse tree
	 */
	exitExportDecl?: (ctx: ExportDeclContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.exportItem`.
	 * @param ctx the parse tree
	 */
	enterExportItem?: (ctx: ExportItemContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.exportItem`.
	 * @param ctx the parse tree
	 */
	exitExportItem?: (ctx: ExportItemContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.importDecl`.
	 * @param ctx the parse tree
	 */
	enterImportDecl?: (ctx: ImportDeclContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.importDecl`.
	 * @param ctx the parse tree
	 */
	exitImportDecl?: (ctx: ImportDeclContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.importItem`.
	 * @param ctx the parse tree
	 */
	enterImportItem?: (ctx: ImportItemContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.importItem`.
	 * @param ctx the parse tree
	 */
	exitImportItem?: (ctx: ImportItemContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.packageStmt`.
	 * @param ctx the parse tree
	 */
	enterPackageStmt?: (ctx: PackageStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.packageStmt`.
	 * @param ctx the parse tree
	 */
	exitPackageStmt?: (ctx: PackageStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.packageIde`.
	 * @param ctx the parse tree
	 */
	enterPackageIde?: (ctx: PackageIdeContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.packageIde`.
	 * @param ctx the parse tree
	 */
	exitPackageIde?: (ctx: PackageIdeContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.type`.
	 * @param ctx the parse tree
	 */
	enterType?: (ctx: TypeContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.type`.
	 * @param ctx the parse tree
	 */
	exitType?: (ctx: TypeContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typePrimary`.
	 * @param ctx the parse tree
	 */
	enterTypePrimary?: (ctx: TypePrimaryContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typePrimary`.
	 * @param ctx the parse tree
	 */
	exitTypePrimary?: (ctx: TypePrimaryContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeIde`.
	 * @param ctx the parse tree
	 */
	enterTypeIde?: (ctx: TypeIdeContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeIde`.
	 * @param ctx the parse tree
	 */
	exitTypeIde?: (ctx: TypeIdeContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeNat`.
	 * @param ctx the parse tree
	 */
	enterTypeNat?: (ctx: TypeNatContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeNat`.
	 * @param ctx the parse tree
	 */
	exitTypeNat?: (ctx: TypeNatContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.interfaceDecl`.
	 * @param ctx the parse tree
	 */
	enterInterfaceDecl?: (ctx: InterfaceDeclContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.interfaceDecl`.
	 * @param ctx the parse tree
	 */
	exitInterfaceDecl?: (ctx: InterfaceDeclContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeDefType`.
	 * @param ctx the parse tree
	 */
	enterTypeDefType?: (ctx: TypeDefTypeContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeDefType`.
	 * @param ctx the parse tree
	 */
	exitTypeDefType?: (ctx: TypeDefTypeContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeFormals`.
	 * @param ctx the parse tree
	 */
	enterTypeFormals?: (ctx: TypeFormalsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeFormals`.
	 * @param ctx the parse tree
	 */
	exitTypeFormals?: (ctx: TypeFormalsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeFormal`.
	 * @param ctx the parse tree
	 */
	enterTypeFormal?: (ctx: TypeFormalContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeFormal`.
	 * @param ctx the parse tree
	 */
	exitTypeFormal?: (ctx: TypeFormalContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.interfaceMemberDecl`.
	 * @param ctx the parse tree
	 */
	enterInterfaceMemberDecl?: (ctx: InterfaceMemberDeclContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.interfaceMemberDecl`.
	 * @param ctx the parse tree
	 */
	exitInterfaceMemberDecl?: (ctx: InterfaceMemberDeclContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.methodProto`.
	 * @param ctx the parse tree
	 */
	enterMethodProto?: (ctx: MethodProtoContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.methodProto`.
	 * @param ctx the parse tree
	 */
	exitMethodProto?: (ctx: MethodProtoContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.methodProtoFormals`.
	 * @param ctx the parse tree
	 */
	enterMethodProtoFormals?: (ctx: MethodProtoFormalsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.methodProtoFormals`.
	 * @param ctx the parse tree
	 */
	exitMethodProtoFormals?: (ctx: MethodProtoFormalsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.methodProtoFormal`.
	 * @param ctx the parse tree
	 */
	enterMethodProtoFormal?: (ctx: MethodProtoFormalContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.methodProtoFormal`.
	 * @param ctx the parse tree
	 */
	exitMethodProtoFormal?: (ctx: MethodProtoFormalContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.subinterfaceDecl`.
	 * @param ctx the parse tree
	 */
	enterSubinterfaceDecl?: (ctx: SubinterfaceDeclContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.subinterfaceDecl`.
	 * @param ctx the parse tree
	 */
	exitSubinterfaceDecl?: (ctx: SubinterfaceDeclContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleDef`.
	 * @param ctx the parse tree
	 */
	enterModuleDef?: (ctx: ModuleDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleDef`.
	 * @param ctx the parse tree
	 */
	exitModuleDef?: (ctx: ModuleDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleProto`.
	 * @param ctx the parse tree
	 */
	enterModuleProto?: (ctx: ModuleProtoContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleProto`.
	 * @param ctx the parse tree
	 */
	exitModuleProto?: (ctx: ModuleProtoContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleFormalParams`.
	 * @param ctx the parse tree
	 */
	enterModuleFormalParams?: (ctx: ModuleFormalParamsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleFormalParams`.
	 * @param ctx the parse tree
	 */
	exitModuleFormalParams?: (ctx: ModuleFormalParamsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleFormalParam`.
	 * @param ctx the parse tree
	 */
	enterModuleFormalParam?: (ctx: ModuleFormalParamContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleFormalParam`.
	 * @param ctx the parse tree
	 */
	exitModuleFormalParam?: (ctx: ModuleFormalParamContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleFormalArgs`.
	 * @param ctx the parse tree
	 */
	enterModuleFormalArgs?: (ctx: ModuleFormalArgsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleFormalArgs`.
	 * @param ctx the parse tree
	 */
	exitModuleFormalArgs?: (ctx: ModuleFormalArgsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterModuleStmt?: (ctx: ModuleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitModuleStmt?: (ctx: ModuleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleInst`.
	 * @param ctx the parse tree
	 */
	enterModuleInst?: (ctx: ModuleInstContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleInst`.
	 * @param ctx the parse tree
	 */
	exitModuleInst?: (ctx: ModuleInstContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleApp`.
	 * @param ctx the parse tree
	 */
	enterModuleApp?: (ctx: ModuleAppContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleApp`.
	 * @param ctx the parse tree
	 */
	exitModuleApp?: (ctx: ModuleAppContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleActualParamArg`.
	 * @param ctx the parse tree
	 */
	enterModuleActualParamArg?: (ctx: ModuleActualParamArgContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleActualParamArg`.
	 * @param ctx the parse tree
	 */
	exitModuleActualParamArg?: (ctx: ModuleActualParamArgContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleApp2`.
	 * @param ctx the parse tree
	 */
	enterModuleApp2?: (ctx: ModuleApp2Context) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleApp2`.
	 * @param ctx the parse tree
	 */
	exitModuleApp2?: (ctx: ModuleApp2Context) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleActualParam`.
	 * @param ctx the parse tree
	 */
	enterModuleActualParam?: (ctx: ModuleActualParamContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleActualParam`.
	 * @param ctx the parse tree
	 */
	exitModuleActualParam?: (ctx: ModuleActualParamContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleActualArgs`.
	 * @param ctx the parse tree
	 */
	enterModuleActualArgs?: (ctx: ModuleActualArgsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleActualArgs`.
	 * @param ctx the parse tree
	 */
	exitModuleActualArgs?: (ctx: ModuleActualArgsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.moduleActualArg`.
	 * @param ctx the parse tree
	 */
	enterModuleActualArg?: (ctx: ModuleActualArgContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.moduleActualArg`.
	 * @param ctx the parse tree
	 */
	exitModuleActualArg?: (ctx: ModuleActualArgContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.methodDef`.
	 * @param ctx the parse tree
	 */
	enterMethodDef?: (ctx: MethodDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.methodDef`.
	 * @param ctx the parse tree
	 */
	exitMethodDef?: (ctx: MethodDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.implicitCond`.
	 * @param ctx the parse tree
	 */
	enterImplicitCond?: (ctx: ImplicitCondContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.implicitCond`.
	 * @param ctx the parse tree
	 */
	exitImplicitCond?: (ctx: ImplicitCondContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.methodFormals`.
	 * @param ctx the parse tree
	 */
	enterMethodFormals?: (ctx: MethodFormalsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.methodFormals`.
	 * @param ctx the parse tree
	 */
	exitMethodFormals?: (ctx: MethodFormalsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.methodFormal`.
	 * @param ctx the parse tree
	 */
	enterMethodFormal?: (ctx: MethodFormalContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.methodFormal`.
	 * @param ctx the parse tree
	 */
	exitMethodFormal?: (ctx: MethodFormalContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.subinterfaceDef`.
	 * @param ctx the parse tree
	 */
	enterSubinterfaceDef?: (ctx: SubinterfaceDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.subinterfaceDef`.
	 * @param ctx the parse tree
	 */
	exitSubinterfaceDef?: (ctx: SubinterfaceDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.interfaceStmt`.
	 * @param ctx the parse tree
	 */
	enterInterfaceStmt?: (ctx: InterfaceStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.interfaceStmt`.
	 * @param ctx the parse tree
	 */
	exitInterfaceStmt?: (ctx: InterfaceStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterExpressionStmt?: (ctx: ExpressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitExpressionStmt?: (ctx: ExpressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.r_rule`.
	 * @param ctx the parse tree
	 */
	enterR_rule?: (ctx: R_ruleContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.r_rule`.
	 * @param ctx the parse tree
	 */
	exitR_rule?: (ctx: R_ruleContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.ruleCond`.
	 * @param ctx the parse tree
	 */
	enterRuleCond?: (ctx: RuleCondContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.ruleCond`.
	 * @param ctx the parse tree
	 */
	exitRuleCond?: (ctx: RuleCondContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.ruleBody`.
	 * @param ctx the parse tree
	 */
	enterRuleBody?: (ctx: RuleBodyContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.ruleBody`.
	 * @param ctx the parse tree
	 */
	exitRuleBody?: (ctx: RuleBodyContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeDef`.
	 * @param ctx the parse tree
	 */
	enterTypeDef?: (ctx: TypeDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeDef`.
	 * @param ctx the parse tree
	 */
	exitTypeDef?: (ctx: TypeDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typedefSynonym`.
	 * @param ctx the parse tree
	 */
	enterTypedefSynonym?: (ctx: TypedefSynonymContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typedefSynonym`.
	 * @param ctx the parse tree
	 */
	exitTypedefSynonym?: (ctx: TypedefSynonymContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typedefEnum`.
	 * @param ctx the parse tree
	 */
	enterTypedefEnum?: (ctx: TypedefEnumContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typedefEnum`.
	 * @param ctx the parse tree
	 */
	exitTypedefEnum?: (ctx: TypedefEnumContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typedefEnumElements`.
	 * @param ctx the parse tree
	 */
	enterTypedefEnumElements?: (ctx: TypedefEnumElementsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typedefEnumElements`.
	 * @param ctx the parse tree
	 */
	exitTypedefEnumElements?: (ctx: TypedefEnumElementsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typedefEnumElement`.
	 * @param ctx the parse tree
	 */
	enterTypedefEnumElement?: (ctx: TypedefEnumElementContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typedefEnumElement`.
	 * @param ctx the parse tree
	 */
	exitTypedefEnumElement?: (ctx: TypedefEnumElementContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typedefStruct`.
	 * @param ctx the parse tree
	 */
	enterTypedefStruct?: (ctx: TypedefStructContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typedefStruct`.
	 * @param ctx the parse tree
	 */
	exitTypedefStruct?: (ctx: TypedefStructContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typedefTaggedUnion`.
	 * @param ctx the parse tree
	 */
	enterTypedefTaggedUnion?: (ctx: TypedefTaggedUnionContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typedefTaggedUnion`.
	 * @param ctx the parse tree
	 */
	exitTypedefTaggedUnion?: (ctx: TypedefTaggedUnionContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.structMember`.
	 * @param ctx the parse tree
	 */
	enterStructMember?: (ctx: StructMemberContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.structMember`.
	 * @param ctx the parse tree
	 */
	exitStructMember?: (ctx: StructMemberContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.unionMember`.
	 * @param ctx the parse tree
	 */
	enterUnionMember?: (ctx: UnionMemberContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.unionMember`.
	 * @param ctx the parse tree
	 */
	exitUnionMember?: (ctx: UnionMemberContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.subStruct`.
	 * @param ctx the parse tree
	 */
	enterSubStruct?: (ctx: SubStructContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.subStruct`.
	 * @param ctx the parse tree
	 */
	exitSubStruct?: (ctx: SubStructContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.subUnion`.
	 * @param ctx the parse tree
	 */
	enterSubUnion?: (ctx: SubUnionContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.subUnion`.
	 * @param ctx the parse tree
	 */
	exitSubUnion?: (ctx: SubUnionContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.varDecl`.
	 * @param ctx the parse tree
	 */
	enterVarDecl?: (ctx: VarDeclContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.varDecl`.
	 * @param ctx the parse tree
	 */
	exitVarDecl?: (ctx: VarDeclContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.varInit`.
	 * @param ctx the parse tree
	 */
	enterVarInit?: (ctx: VarInitContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.varInit`.
	 * @param ctx the parse tree
	 */
	exitVarInit?: (ctx: VarInitContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.arrayDims`.
	 * @param ctx the parse tree
	 */
	enterArrayDims?: (ctx: ArrayDimsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.arrayDims`.
	 * @param ctx the parse tree
	 */
	exitArrayDims?: (ctx: ArrayDimsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.varAssign`.
	 * @param ctx the parse tree
	 */
	enterVarAssign?: (ctx: VarAssignContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.varAssign`.
	 * @param ctx the parse tree
	 */
	exitVarAssign?: (ctx: VarAssignContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.lValue`.
	 * @param ctx the parse tree
	 */
	enterLValue?: (ctx: LValueContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.lValue`.
	 * @param ctx the parse tree
	 */
	exitLValue?: (ctx: LValueContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.regWrite`.
	 * @param ctx the parse tree
	 */
	enterRegWrite?: (ctx: RegWriteContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.regWrite`.
	 * @param ctx the parse tree
	 */
	exitRegWrite?: (ctx: RegWriteContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.arrayIndexes`.
	 * @param ctx the parse tree
	 */
	enterArrayIndexes?: (ctx: ArrayIndexesContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.arrayIndexes`.
	 * @param ctx the parse tree
	 */
	exitArrayIndexes?: (ctx: ArrayIndexesContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.beginEndStmt_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterBeginEndStmt_functionBodyStmt?: (ctx: BeginEndStmt_functionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.beginEndStmt_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitBeginEndStmt_functionBodyStmt?: (ctx: BeginEndStmt_functionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.beginEndStmt_actionStmt`.
	 * @param ctx the parse tree
	 */
	enterBeginEndStmt_actionStmt?: (ctx: BeginEndStmt_actionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.beginEndStmt_actionStmt`.
	 * @param ctx the parse tree
	 */
	exitBeginEndStmt_actionStmt?: (ctx: BeginEndStmt_actionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.beginEndStmt_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterBeginEndStmt_actionValueStmt?: (ctx: BeginEndStmt_actionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.beginEndStmt_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitBeginEndStmt_actionValueStmt?: (ctx: BeginEndStmt_actionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.beginEndStmt_moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterBeginEndStmt_moduleStmt?: (ctx: BeginEndStmt_moduleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.beginEndStmt_moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitBeginEndStmt_moduleStmt?: (ctx: BeginEndStmt_moduleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.beginEndStmt_expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterBeginEndStmt_expressionStmt?: (ctx: BeginEndStmt_expressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.beginEndStmt_expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitBeginEndStmt_expressionStmt?: (ctx: BeginEndStmt_expressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.if_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterIf_functionBodyStmt?: (ctx: If_functionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.if_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitIf_functionBodyStmt?: (ctx: If_functionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.if_actionStmt`.
	 * @param ctx the parse tree
	 */
	enterIf_actionStmt?: (ctx: If_actionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.if_actionStmt`.
	 * @param ctx the parse tree
	 */
	exitIf_actionStmt?: (ctx: If_actionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.if_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterIf_actionValueStmt?: (ctx: If_actionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.if_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitIf_actionValueStmt?: (ctx: If_actionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.if_moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterIf_moduleStmt?: (ctx: If_moduleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.if_moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitIf_moduleStmt?: (ctx: If_moduleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.if_expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterIf_expressionStmt?: (ctx: If_expressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.if_expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitIf_expressionStmt?: (ctx: If_expressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.case_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterCase_functionBodyStmt?: (ctx: Case_functionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.case_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitCase_functionBodyStmt?: (ctx: Case_functionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.case_actionStmt`.
	 * @param ctx the parse tree
	 */
	enterCase_actionStmt?: (ctx: Case_actionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.case_actionStmt`.
	 * @param ctx the parse tree
	 */
	exitCase_actionStmt?: (ctx: Case_actionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.case_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterCase_actionValueStmt?: (ctx: Case_actionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.case_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitCase_actionValueStmt?: (ctx: Case_actionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.case_moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterCase_moduleStmt?: (ctx: Case_moduleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.case_moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitCase_moduleStmt?: (ctx: Case_moduleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.case_expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterCase_expressionStmt?: (ctx: Case_expressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.case_expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitCase_expressionStmt?: (ctx: Case_expressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.caseItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterCaseItem_functionBodyStmt?: (ctx: CaseItem_functionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.caseItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitCaseItem_functionBodyStmt?: (ctx: CaseItem_functionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.caseItem_actionStmt`.
	 * @param ctx the parse tree
	 */
	enterCaseItem_actionStmt?: (ctx: CaseItem_actionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.caseItem_actionStmt`.
	 * @param ctx the parse tree
	 */
	exitCaseItem_actionStmt?: (ctx: CaseItem_actionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.caseItem_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterCaseItem_actionValueStmt?: (ctx: CaseItem_actionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.caseItem_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitCaseItem_actionValueStmt?: (ctx: CaseItem_actionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.caseItem_moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterCaseItem_moduleStmt?: (ctx: CaseItem_moduleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.caseItem_moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitCaseItem_moduleStmt?: (ctx: CaseItem_moduleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.caseItem_expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterCaseItem_expressionStmt?: (ctx: CaseItem_expressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.caseItem_expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitCaseItem_expressionStmt?: (ctx: CaseItem_expressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.defaultItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterDefaultItem_functionBodyStmt?: (ctx: DefaultItem_functionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.defaultItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitDefaultItem_functionBodyStmt?: (ctx: DefaultItem_functionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.defaultItem_actionStmt`.
	 * @param ctx the parse tree
	 */
	enterDefaultItem_actionStmt?: (ctx: DefaultItem_actionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.defaultItem_actionStmt`.
	 * @param ctx the parse tree
	 */
	exitDefaultItem_actionStmt?: (ctx: DefaultItem_actionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.defaultItem_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterDefaultItem_actionValueStmt?: (ctx: DefaultItem_actionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.defaultItem_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitDefaultItem_actionValueStmt?: (ctx: DefaultItem_actionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.defaultItem_moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterDefaultItem_moduleStmt?: (ctx: DefaultItem_moduleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.defaultItem_moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitDefaultItem_moduleStmt?: (ctx: DefaultItem_moduleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.defaultItem_expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterDefaultItem_expressionStmt?: (ctx: DefaultItem_expressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.defaultItem_expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitDefaultItem_expressionStmt?: (ctx: DefaultItem_expressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.while_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterWhile_functionBodyStmt?: (ctx: While_functionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.while_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitWhile_functionBodyStmt?: (ctx: While_functionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.while_actionStmt`.
	 * @param ctx the parse tree
	 */
	enterWhile_actionStmt?: (ctx: While_actionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.while_actionStmt`.
	 * @param ctx the parse tree
	 */
	exitWhile_actionStmt?: (ctx: While_actionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.while_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterWhile_actionValueStmt?: (ctx: While_actionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.while_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitWhile_actionValueStmt?: (ctx: While_actionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.while_moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterWhile_moduleStmt?: (ctx: While_moduleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.while_moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitWhile_moduleStmt?: (ctx: While_moduleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.while_expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterWhile_expressionStmt?: (ctx: While_expressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.while_expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitWhile_expressionStmt?: (ctx: While_expressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.for_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterFor_functionBodyStmt?: (ctx: For_functionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.for_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitFor_functionBodyStmt?: (ctx: For_functionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.for_actionStmt`.
	 * @param ctx the parse tree
	 */
	enterFor_actionStmt?: (ctx: For_actionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.for_actionStmt`.
	 * @param ctx the parse tree
	 */
	exitFor_actionStmt?: (ctx: For_actionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.for_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterFor_actionValueStmt?: (ctx: For_actionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.for_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitFor_actionValueStmt?: (ctx: For_actionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.for_moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterFor_moduleStmt?: (ctx: For_moduleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.for_moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitFor_moduleStmt?: (ctx: For_moduleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.for_expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterFor_expressionStmt?: (ctx: For_expressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.for_expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitFor_expressionStmt?: (ctx: For_expressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.forInit`.
	 * @param ctx the parse tree
	 */
	enterForInit?: (ctx: ForInitContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.forInit`.
	 * @param ctx the parse tree
	 */
	exitForInit?: (ctx: ForInitContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.forOldInit`.
	 * @param ctx the parse tree
	 */
	enterForOldInit?: (ctx: ForOldInitContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.forOldInit`.
	 * @param ctx the parse tree
	 */
	exitForOldInit?: (ctx: ForOldInitContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.simpleVarAssign`.
	 * @param ctx the parse tree
	 */
	enterSimpleVarAssign?: (ctx: SimpleVarAssignContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.simpleVarAssign`.
	 * @param ctx the parse tree
	 */
	exitSimpleVarAssign?: (ctx: SimpleVarAssignContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.forNewInit`.
	 * @param ctx the parse tree
	 */
	enterForNewInit?: (ctx: ForNewInitContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.forNewInit`.
	 * @param ctx the parse tree
	 */
	exitForNewInit?: (ctx: ForNewInitContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.simpleVarDeclAssign`.
	 * @param ctx the parse tree
	 */
	enterSimpleVarDeclAssign?: (ctx: SimpleVarDeclAssignContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.simpleVarDeclAssign`.
	 * @param ctx the parse tree
	 */
	exitSimpleVarDeclAssign?: (ctx: SimpleVarDeclAssignContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.forTest`.
	 * @param ctx the parse tree
	 */
	enterForTest?: (ctx: ForTestContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.forTest`.
	 * @param ctx the parse tree
	 */
	exitForTest?: (ctx: ForTestContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.forIncr`.
	 * @param ctx the parse tree
	 */
	enterForIncr?: (ctx: ForIncrContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.forIncr`.
	 * @param ctx the parse tree
	 */
	exitForIncr?: (ctx: ForIncrContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.varIncr`.
	 * @param ctx the parse tree
	 */
	enterVarIncr?: (ctx: VarIncrContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.varIncr`.
	 * @param ctx the parse tree
	 */
	exitVarIncr?: (ctx: VarIncrContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.functionDef`.
	 * @param ctx the parse tree
	 */
	enterFunctionDef?: (ctx: FunctionDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.functionDef`.
	 * @param ctx the parse tree
	 */
	exitFunctionDef?: (ctx: FunctionDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.functionProto`.
	 * @param ctx the parse tree
	 */
	enterFunctionProto?: (ctx: FunctionProtoContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.functionProto`.
	 * @param ctx the parse tree
	 */
	exitFunctionProto?: (ctx: FunctionProtoContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.functionFormals`.
	 * @param ctx the parse tree
	 */
	enterFunctionFormals?: (ctx: FunctionFormalsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.functionFormals`.
	 * @param ctx the parse tree
	 */
	exitFunctionFormals?: (ctx: FunctionFormalsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.functionFormal`.
	 * @param ctx the parse tree
	 */
	enterFunctionFormal?: (ctx: FunctionFormalContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.functionFormal`.
	 * @param ctx the parse tree
	 */
	exitFunctionFormal?: (ctx: FunctionFormalContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.functionBody`.
	 * @param ctx the parse tree
	 */
	enterFunctionBody?: (ctx: FunctionBodyContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.functionBody`.
	 * @param ctx the parse tree
	 */
	exitFunctionBody?: (ctx: FunctionBodyContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterFunctionBodyStmt?: (ctx: FunctionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitFunctionBodyStmt?: (ctx: FunctionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.returnStmt`.
	 * @param ctx the parse tree
	 */
	enterReturnStmt?: (ctx: ReturnStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.returnStmt`.
	 * @param ctx the parse tree
	 */
	exitReturnStmt?: (ctx: ReturnStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression?: (ctx: ExpressionContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.exprPrimary`.
	 * @param ctx the parse tree
	 */
	enterExprPrimary?: (ctx: ExprPrimaryContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.exprPrimary`.
	 * @param ctx the parse tree
	 */
	exitExprPrimary?: (ctx: ExprPrimaryContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.condExpr`.
	 * @param ctx the parse tree
	 */
	enterCondExpr?: (ctx: CondExprContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.condExpr`.
	 * @param ctx the parse tree
	 */
	exitCondExpr?: (ctx: CondExprContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.condPredicate`.
	 * @param ctx the parse tree
	 */
	enterCondPredicate?: (ctx: CondPredicateContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.condPredicate`.
	 * @param ctx the parse tree
	 */
	exitCondPredicate?: (ctx: CondPredicateContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.exprOrCondPattern`.
	 * @param ctx the parse tree
	 */
	enterExprOrCondPattern?: (ctx: ExprOrCondPatternContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.exprOrCondPattern`.
	 * @param ctx the parse tree
	 */
	exitExprOrCondPattern?: (ctx: ExprOrCondPatternContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.operatorExpr`.
	 * @param ctx the parse tree
	 */
	enterOperatorExpr?: (ctx: OperatorExprContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.operatorExpr`.
	 * @param ctx the parse tree
	 */
	exitOperatorExpr?: (ctx: OperatorExprContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.unop`.
	 * @param ctx the parse tree
	 */
	enterUnop?: (ctx: UnopContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.unop`.
	 * @param ctx the parse tree
	 */
	exitUnop?: (ctx: UnopContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.binop`.
	 * @param ctx the parse tree
	 */
	enterBinop?: (ctx: BinopContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.binop`.
	 * @param ctx the parse tree
	 */
	exitBinop?: (ctx: BinopContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.bitConcat`.
	 * @param ctx the parse tree
	 */
	enterBitConcat?: (ctx: BitConcatContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.bitConcat`.
	 * @param ctx the parse tree
	 */
	exitBitConcat?: (ctx: BitConcatContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.beginEndExpr`.
	 * @param ctx the parse tree
	 */
	enterBeginEndExpr?: (ctx: BeginEndExprContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.beginEndExpr`.
	 * @param ctx the parse tree
	 */
	exitBeginEndExpr?: (ctx: BeginEndExprContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.actionBlock`.
	 * @param ctx the parse tree
	 */
	enterActionBlock?: (ctx: ActionBlockContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.actionBlock`.
	 * @param ctx the parse tree
	 */
	exitActionBlock?: (ctx: ActionBlockContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.actionStmt`.
	 * @param ctx the parse tree
	 */
	enterActionStmt?: (ctx: ActionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.actionStmt`.
	 * @param ctx the parse tree
	 */
	exitActionStmt?: (ctx: ActionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.actionValueBlock`.
	 * @param ctx the parse tree
	 */
	enterActionValueBlock?: (ctx: ActionValueBlockContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.actionValueBlock`.
	 * @param ctx the parse tree
	 */
	exitActionValueBlock?: (ctx: ActionValueBlockContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterActionValueStmt?: (ctx: ActionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitActionValueStmt?: (ctx: ActionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.varDeclDo`.
	 * @param ctx the parse tree
	 */
	enterVarDeclDo?: (ctx: VarDeclDoContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.varDeclDo`.
	 * @param ctx the parse tree
	 */
	exitVarDeclDo?: (ctx: VarDeclDoContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.varDo`.
	 * @param ctx the parse tree
	 */
	enterVarDo?: (ctx: VarDoContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.varDo`.
	 * @param ctx the parse tree
	 */
	exitVarDo?: (ctx: VarDoContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.functionCall`.
	 * @param ctx the parse tree
	 */
	enterFunctionCall?: (ctx: FunctionCallContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.functionCall`.
	 * @param ctx the parse tree
	 */
	exitFunctionCall?: (ctx: FunctionCallContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.methodCall`.
	 * @param ctx the parse tree
	 */
	enterMethodCall?: (ctx: MethodCallContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.methodCall`.
	 * @param ctx the parse tree
	 */
	exitMethodCall?: (ctx: MethodCallContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeAssertion`.
	 * @param ctx the parse tree
	 */
	enterTypeAssertion?: (ctx: TypeAssertionContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeAssertion`.
	 * @param ctx the parse tree
	 */
	exitTypeAssertion?: (ctx: TypeAssertionContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.structExpr`.
	 * @param ctx the parse tree
	 */
	enterStructExpr?: (ctx: StructExprContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.structExpr`.
	 * @param ctx the parse tree
	 */
	exitStructExpr?: (ctx: StructExprContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.memberBind`.
	 * @param ctx the parse tree
	 */
	enterMemberBind?: (ctx: MemberBindContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.memberBind`.
	 * @param ctx the parse tree
	 */
	exitMemberBind?: (ctx: MemberBindContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.taggedUnionExpr`.
	 * @param ctx the parse tree
	 */
	enterTaggedUnionExpr?: (ctx: TaggedUnionExprContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.taggedUnionExpr`.
	 * @param ctx the parse tree
	 */
	exitTaggedUnionExpr?: (ctx: TaggedUnionExprContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.interfaceExpr`.
	 * @param ctx the parse tree
	 */
	enterInterfaceExpr?: (ctx: InterfaceExprContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.interfaceExpr`.
	 * @param ctx the parse tree
	 */
	exitInterfaceExpr?: (ctx: InterfaceExprContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.ruleExpr`.
	 * @param ctx the parse tree
	 */
	enterRuleExpr?: (ctx: RuleExprContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.ruleExpr`.
	 * @param ctx the parse tree
	 */
	exitRuleExpr?: (ctx: RuleExprContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.ruleStmt`.
	 * @param ctx the parse tree
	 */
	enterRuleStmt?: (ctx: RuleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.ruleStmt`.
	 * @param ctx the parse tree
	 */
	exitRuleStmt?: (ctx: RuleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.pattern`.
	 * @param ctx the parse tree
	 */
	enterPattern?: (ctx: PatternContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.pattern`.
	 * @param ctx the parse tree
	 */
	exitPattern?: (ctx: PatternContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.constantPattern`.
	 * @param ctx the parse tree
	 */
	enterConstantPattern?: (ctx: ConstantPatternContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.constantPattern`.
	 * @param ctx the parse tree
	 */
	exitConstantPattern?: (ctx: ConstantPatternContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.taggedUnionPattern`.
	 * @param ctx the parse tree
	 */
	enterTaggedUnionPattern?: (ctx: TaggedUnionPatternContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.taggedUnionPattern`.
	 * @param ctx the parse tree
	 */
	exitTaggedUnionPattern?: (ctx: TaggedUnionPatternContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.structPattern`.
	 * @param ctx the parse tree
	 */
	enterStructPattern?: (ctx: StructPatternContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.structPattern`.
	 * @param ctx the parse tree
	 */
	exitStructPattern?: (ctx: StructPatternContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.tuplePattern`.
	 * @param ctx the parse tree
	 */
	enterTuplePattern?: (ctx: TuplePatternContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.tuplePattern`.
	 * @param ctx the parse tree
	 */
	exitTuplePattern?: (ctx: TuplePatternContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.casePatItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	enterCasePatItem_functionBodyStmt?: (ctx: CasePatItem_functionBodyStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.casePatItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 */
	exitCasePatItem_functionBodyStmt?: (ctx: CasePatItem_functionBodyStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.casePatItem_actionStmt`.
	 * @param ctx the parse tree
	 */
	enterCasePatItem_actionStmt?: (ctx: CasePatItem_actionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.casePatItem_actionStmt`.
	 * @param ctx the parse tree
	 */
	exitCasePatItem_actionStmt?: (ctx: CasePatItem_actionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.casePatItem_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	enterCasePatItem_actionValueStmt?: (ctx: CasePatItem_actionValueStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.casePatItem_actionValueStmt`.
	 * @param ctx the parse tree
	 */
	exitCasePatItem_actionValueStmt?: (ctx: CasePatItem_actionValueStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.casePatItem_moduleStmt`.
	 * @param ctx the parse tree
	 */
	enterCasePatItem_moduleStmt?: (ctx: CasePatItem_moduleStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.casePatItem_moduleStmt`.
	 * @param ctx the parse tree
	 */
	exitCasePatItem_moduleStmt?: (ctx: CasePatItem_moduleStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.casePatItem_expressionStmt`.
	 * @param ctx the parse tree
	 */
	enterCasePatItem_expressionStmt?: (ctx: CasePatItem_expressionStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.casePatItem_expressionStmt`.
	 * @param ctx the parse tree
	 */
	exitCasePatItem_expressionStmt?: (ctx: CasePatItem_expressionStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.caseExpr`.
	 * @param ctx the parse tree
	 */
	enterCaseExpr?: (ctx: CaseExprContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.caseExpr`.
	 * @param ctx the parse tree
	 */
	exitCaseExpr?: (ctx: CaseExprContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.caseExprItem`.
	 * @param ctx the parse tree
	 */
	enterCaseExprItem?: (ctx: CaseExprItemContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.caseExprItem`.
	 * @param ctx the parse tree
	 */
	exitCaseExprItem?: (ctx: CaseExprItemContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.systemTaskStmt`.
	 * @param ctx the parse tree
	 */
	enterSystemTaskStmt?: (ctx: SystemTaskStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.systemTaskStmt`.
	 * @param ctx the parse tree
	 */
	exitSystemTaskStmt?: (ctx: SystemTaskStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.displayTaskName`.
	 * @param ctx the parse tree
	 */
	enterDisplayTaskName?: (ctx: DisplayTaskNameContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.displayTaskName`.
	 * @param ctx the parse tree
	 */
	exitDisplayTaskName?: (ctx: DisplayTaskNameContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.stringTaskName`.
	 * @param ctx the parse tree
	 */
	enterStringTaskName?: (ctx: StringTaskNameContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.stringTaskName`.
	 * @param ctx the parse tree
	 */
	exitStringTaskName?: (ctx: StringTaskNameContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.systemFunctionCall`.
	 * @param ctx the parse tree
	 */
	enterSystemFunctionCall?: (ctx: SystemFunctionCallContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.systemFunctionCall`.
	 * @param ctx the parse tree
	 */
	exitSystemFunctionCall?: (ctx: SystemFunctionCallContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.systemTaskCall`.
	 * @param ctx the parse tree
	 */
	enterSystemTaskCall?: (ctx: SystemTaskCallContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.systemTaskCall`.
	 * @param ctx the parse tree
	 */
	exitSystemTaskCall?: (ctx: SystemTaskCallContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.stringAVTaskName`.
	 * @param ctx the parse tree
	 */
	enterStringAVTaskName?: (ctx: StringAVTaskNameContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.stringAVTaskName`.
	 * @param ctx the parse tree
	 */
	exitStringAVTaskName?: (ctx: StringAVTaskNameContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.attributeInstances`.
	 * @param ctx the parse tree
	 */
	enterAttributeInstances?: (ctx: AttributeInstancesContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.attributeInstances`.
	 * @param ctx the parse tree
	 */
	exitAttributeInstances?: (ctx: AttributeInstancesContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.attributeInstance`.
	 * @param ctx the parse tree
	 */
	enterAttributeInstance?: (ctx: AttributeInstanceContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.attributeInstance`.
	 * @param ctx the parse tree
	 */
	exitAttributeInstance?: (ctx: AttributeInstanceContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.attrSpec`.
	 * @param ctx the parse tree
	 */
	enterAttrSpec?: (ctx: AttrSpecContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.attrSpec`.
	 * @param ctx the parse tree
	 */
	exitAttrSpec?: (ctx: AttrSpecContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.attrName`.
	 * @param ctx the parse tree
	 */
	enterAttrName?: (ctx: AttrNameContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.attrName`.
	 * @param ctx the parse tree
	 */
	exitAttrName?: (ctx: AttrNameContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.provisos`.
	 * @param ctx the parse tree
	 */
	enterProvisos?: (ctx: ProvisosContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.provisos`.
	 * @param ctx the parse tree
	 */
	exitProvisos?: (ctx: ProvisosContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.proviso`.
	 * @param ctx the parse tree
	 */
	enterProviso?: (ctx: ProvisoContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.proviso`.
	 * @param ctx the parse tree
	 */
	exitProviso?: (ctx: ProvisoContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeclassDef`.
	 * @param ctx the parse tree
	 */
	enterTypeclassDef?: (ctx: TypeclassDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeclassDef`.
	 * @param ctx the parse tree
	 */
	exitTypeclassDef?: (ctx: TypeclassDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeclassIde`.
	 * @param ctx the parse tree
	 */
	enterTypeclassIde?: (ctx: TypeclassIdeContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeclassIde`.
	 * @param ctx the parse tree
	 */
	exitTypeclassIde?: (ctx: TypeclassIdeContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typelist`.
	 * @param ctx the parse tree
	 */
	enterTypelist?: (ctx: TypelistContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typelist`.
	 * @param ctx the parse tree
	 */
	exitTypelist?: (ctx: TypelistContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typedepends`.
	 * @param ctx the parse tree
	 */
	enterTypedepends?: (ctx: TypedependsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typedepends`.
	 * @param ctx the parse tree
	 */
	exitTypedepends?: (ctx: TypedependsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typedepend`.
	 * @param ctx the parse tree
	 */
	enterTypedepend?: (ctx: TypedependContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typedepend`.
	 * @param ctx the parse tree
	 */
	exitTypedepend?: (ctx: TypedependContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.overloadedDef`.
	 * @param ctx the parse tree
	 */
	enterOverloadedDef?: (ctx: OverloadedDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.overloadedDef`.
	 * @param ctx the parse tree
	 */
	exitOverloadedDef?: (ctx: OverloadedDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.typeclassInstanceDef`.
	 * @param ctx the parse tree
	 */
	enterTypeclassInstanceDef?: (ctx: TypeclassInstanceDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.typeclassInstanceDef`.
	 * @param ctx the parse tree
	 */
	exitTypeclassInstanceDef?: (ctx: TypeclassInstanceDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.derives`.
	 * @param ctx the parse tree
	 */
	enterDerives?: (ctx: DerivesContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.derives`.
	 * @param ctx the parse tree
	 */
	exitDerives?: (ctx: DerivesContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.externModuleImport`.
	 * @param ctx the parse tree
	 */
	enterExternModuleImport?: (ctx: ExternModuleImportContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.externModuleImport`.
	 * @param ctx the parse tree
	 */
	exitExternModuleImport?: (ctx: ExternModuleImportContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.importBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterImportBVIStmt?: (ctx: ImportBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.importBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitImportBVIStmt?: (ctx: ImportBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.enabled_sel`.
	 * @param ctx the parse tree
	 */
	enterEnabled_sel?: (ctx: Enabled_selContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.enabled_sel`.
	 * @param ctx the parse tree
	 */
	exitEnabled_sel?: (ctx: Enabled_selContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.ready_sel`.
	 * @param ctx the parse tree
	 */
	enterReady_sel?: (ctx: Ready_selContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.ready_sel`.
	 * @param ctx the parse tree
	 */
	exitReady_sel?: (ctx: Ready_selContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.clocked_by_sel`.
	 * @param ctx the parse tree
	 */
	enterClocked_by_sel?: (ctx: Clocked_by_selContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.clocked_by_sel`.
	 * @param ctx the parse tree
	 */
	exitClocked_by_sel?: (ctx: Clocked_by_selContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.reset_by_sel`.
	 * @param ctx the parse tree
	 */
	enterReset_by_sel?: (ctx: Reset_by_selContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.reset_by_sel`.
	 * @param ctx the parse tree
	 */
	exitReset_by_sel?: (ctx: Reset_by_selContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.parameterBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterParameterBVIStmt?: (ctx: ParameterBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.parameterBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitParameterBVIStmt?: (ctx: ParameterBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.methodBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterMethodBVIStmt?: (ctx: MethodBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.methodBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitMethodBVIStmt?: (ctx: MethodBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.portBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterPortBVIStmt?: (ctx: PortBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.portBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitPortBVIStmt?: (ctx: PortBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.inputClockBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterInputClockBVIStmt?: (ctx: InputClockBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.inputClockBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitInputClockBVIStmt?: (ctx: InputClockBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.portsDef`.
	 * @param ctx the parse tree
	 */
	enterPortsDef?: (ctx: PortsDefContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.portsDef`.
	 * @param ctx the parse tree
	 */
	exitPortsDef?: (ctx: PortsDefContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.portId`.
	 * @param ctx the parse tree
	 */
	enterPortId?: (ctx: PortIdContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.portId`.
	 * @param ctx the parse tree
	 */
	exitPortId?: (ctx: PortIdContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.defaultClockBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterDefaultClockBVIStmt?: (ctx: DefaultClockBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.defaultClockBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitDefaultClockBVIStmt?: (ctx: DefaultClockBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.outputClockBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterOutputClockBVIStmt?: (ctx: OutputClockBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.outputClockBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitOutputClockBVIStmt?: (ctx: OutputClockBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.inputResetBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterInputResetBVIStmt?: (ctx: InputResetBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.inputResetBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitInputResetBVIStmt?: (ctx: InputResetBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.clockId`.
	 * @param ctx the parse tree
	 */
	enterClockId?: (ctx: ClockIdContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.clockId`.
	 * @param ctx the parse tree
	 */
	exitClockId?: (ctx: ClockIdContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.defaultResetBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterDefaultResetBVIStmt?: (ctx: DefaultResetBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.defaultResetBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitDefaultResetBVIStmt?: (ctx: DefaultResetBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.outputResetBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterOutputResetBVIStmt?: (ctx: OutputResetBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.outputResetBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitOutputResetBVIStmt?: (ctx: OutputResetBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.ancestorBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterAncestorBVIStmt?: (ctx: AncestorBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.ancestorBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitAncestorBVIStmt?: (ctx: AncestorBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.sameFamilyBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterSameFamilyBVIStmt?: (ctx: SameFamilyBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.sameFamilyBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitSameFamilyBVIStmt?: (ctx: SameFamilyBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.scheduleBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterScheduleBVIStmt?: (ctx: ScheduleBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.scheduleBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitScheduleBVIStmt?: (ctx: ScheduleBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.operatorId`.
	 * @param ctx the parse tree
	 */
	enterOperatorId?: (ctx: OperatorIdContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.operatorId`.
	 * @param ctx the parse tree
	 */
	exitOperatorId?: (ctx: OperatorIdContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.pathBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterPathBVIStmt?: (ctx: PathBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.pathBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitPathBVIStmt?: (ctx: PathBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.interfaceBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterInterfaceBVIStmt?: (ctx: InterfaceBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.interfaceBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitInterfaceBVIStmt?: (ctx: InterfaceBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.interfaceBVIMembDecl`.
	 * @param ctx the parse tree
	 */
	enterInterfaceBVIMembDecl?: (ctx: InterfaceBVIMembDeclContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.interfaceBVIMembDecl`.
	 * @param ctx the parse tree
	 */
	exitInterfaceBVIMembDecl?: (ctx: InterfaceBVIMembDeclContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.inoutBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterInoutBVIStmt?: (ctx: InoutBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.inoutBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitInoutBVIStmt?: (ctx: InoutBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.resetId`.
	 * @param ctx the parse tree
	 */
	enterResetId?: (ctx: ResetIdContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.resetId`.
	 * @param ctx the parse tree
	 */
	exitResetId?: (ctx: ResetIdContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.noResetBVIStmt`.
	 * @param ctx the parse tree
	 */
	enterNoResetBVIStmt?: (ctx: NoResetBVIStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.noResetBVIStmt`.
	 * @param ctx the parse tree
	 */
	exitNoResetBVIStmt?: (ctx: NoResetBVIStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.externCImport`.
	 * @param ctx the parse tree
	 */
	enterExternCImport?: (ctx: ExternCImportContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.externCImport`.
	 * @param ctx the parse tree
	 */
	exitExternCImport?: (ctx: ExternCImportContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.cFuncArgs`.
	 * @param ctx the parse tree
	 */
	enterCFuncArgs?: (ctx: CFuncArgsContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.cFuncArgs`.
	 * @param ctx the parse tree
	 */
	exitCFuncArgs?: (ctx: CFuncArgsContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.cFuncArg`.
	 * @param ctx the parse tree
	 */
	enterCFuncArg?: (ctx: CFuncArgContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.cFuncArg`.
	 * @param ctx the parse tree
	 */
	exitCFuncArg?: (ctx: CFuncArgContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.fsmStmt`.
	 * @param ctx the parse tree
	 */
	enterFsmStmt?: (ctx: FsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.fsmStmt`.
	 * @param ctx the parse tree
	 */
	exitFsmStmt?: (ctx: FsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.exprFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterExprFsmStmt?: (ctx: ExprFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.exprFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitExprFsmStmt?: (ctx: ExprFsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.seqFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterSeqFsmStmt?: (ctx: SeqFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.seqFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitSeqFsmStmt?: (ctx: SeqFsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.parFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterParFsmStmt?: (ctx: ParFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.parFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitParFsmStmt?: (ctx: ParFsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.ifFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterIfFsmStmt?: (ctx: IfFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.ifFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitIfFsmStmt?: (ctx: IfFsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.whileFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterWhileFsmStmt?: (ctx: WhileFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.whileFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitWhileFsmStmt?: (ctx: WhileFsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.forFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterForFsmStmt?: (ctx: ForFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.forFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitForFsmStmt?: (ctx: ForFsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.returnFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterReturnFsmStmt?: (ctx: ReturnFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.returnFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitReturnFsmStmt?: (ctx: ReturnFsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.repeatFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterRepeatFsmStmt?: (ctx: RepeatFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.repeatFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitRepeatFsmStmt?: (ctx: RepeatFsmStmtContext) => void;

	/**
	 * Enter a parse tree produced by `bsvParser.loopBodyFsmStmt`.
	 * @param ctx the parse tree
	 */
	enterLoopBodyFsmStmt?: (ctx: LoopBodyFsmStmtContext) => void;
	/**
	 * Exit a parse tree produced by `bsvParser.loopBodyFsmStmt`.
	 * @param ctx the parse tree
	 */
	exitLoopBodyFsmStmt?: (ctx: LoopBodyFsmStmtContext) => void;
}

