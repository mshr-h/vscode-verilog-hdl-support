// Generated from syntaxes/bsv.g4 by ANTLR 4.9.0-SNAPSHOT


import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";

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
 * This interface defines a complete generic visitor for a parse tree produced
 * by `bsvParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export interface bsvVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `bsvParser.identifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIdentifier?: (ctx: IdentifierContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.identifier_type`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIdentifier_type?: (ctx: Identifier_typeContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.stringLiteral`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStringLiteral?: (ctx: StringLiteralContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.top`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTop?: (ctx: TopContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.r_package`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitR_package?: (ctx: R_packageContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.non_package`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNon_package?: (ctx: Non_packageContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.exportDecl`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExportDecl?: (ctx: ExportDeclContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.exportItem`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExportItem?: (ctx: ExportItemContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.importDecl`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitImportDecl?: (ctx: ImportDeclContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.importItem`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitImportItem?: (ctx: ImportItemContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.packageStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPackageStmt?: (ctx: PackageStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.packageIde`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPackageIde?: (ctx: PackageIdeContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.type`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitType?: (ctx: TypeContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typePrimary`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypePrimary?: (ctx: TypePrimaryContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeIde`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeIde?: (ctx: TypeIdeContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeNat`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeNat?: (ctx: TypeNatContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.interfaceDecl`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInterfaceDecl?: (ctx: InterfaceDeclContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeDefType`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeDefType?: (ctx: TypeDefTypeContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeFormals`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeFormals?: (ctx: TypeFormalsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeFormal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeFormal?: (ctx: TypeFormalContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.interfaceMemberDecl`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInterfaceMemberDecl?: (ctx: InterfaceMemberDeclContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.methodProto`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodProto?: (ctx: MethodProtoContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.methodProtoFormals`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodProtoFormals?: (ctx: MethodProtoFormalsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.methodProtoFormal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodProtoFormal?: (ctx: MethodProtoFormalContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.subinterfaceDecl`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSubinterfaceDecl?: (ctx: SubinterfaceDeclContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleDef?: (ctx: ModuleDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleProto`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleProto?: (ctx: ModuleProtoContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleFormalParams`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleFormalParams?: (ctx: ModuleFormalParamsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleFormalParam`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleFormalParam?: (ctx: ModuleFormalParamContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleFormalArgs`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleFormalArgs?: (ctx: ModuleFormalArgsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleStmt?: (ctx: ModuleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleInst`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleInst?: (ctx: ModuleInstContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleApp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleApp?: (ctx: ModuleAppContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleActualParamArg`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleActualParamArg?: (ctx: ModuleActualParamArgContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleApp2`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleApp2?: (ctx: ModuleApp2Context) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleActualParam`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleActualParam?: (ctx: ModuleActualParamContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleActualArgs`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleActualArgs?: (ctx: ModuleActualArgsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.moduleActualArg`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModuleActualArg?: (ctx: ModuleActualArgContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.methodDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodDef?: (ctx: MethodDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.implicitCond`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitImplicitCond?: (ctx: ImplicitCondContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.methodFormals`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodFormals?: (ctx: MethodFormalsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.methodFormal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodFormal?: (ctx: MethodFormalContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.subinterfaceDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSubinterfaceDef?: (ctx: SubinterfaceDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.interfaceStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInterfaceStmt?: (ctx: InterfaceStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpressionStmt?: (ctx: ExpressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.r_rule`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitR_rule?: (ctx: R_ruleContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.ruleCond`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRuleCond?: (ctx: RuleCondContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.ruleBody`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRuleBody?: (ctx: RuleBodyContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeDef?: (ctx: TypeDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typedefSynonym`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypedefSynonym?: (ctx: TypedefSynonymContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typedefEnum`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypedefEnum?: (ctx: TypedefEnumContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typedefEnumElements`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypedefEnumElements?: (ctx: TypedefEnumElementsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typedefEnumElement`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypedefEnumElement?: (ctx: TypedefEnumElementContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typedefStruct`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypedefStruct?: (ctx: TypedefStructContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typedefTaggedUnion`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypedefTaggedUnion?: (ctx: TypedefTaggedUnionContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.structMember`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStructMember?: (ctx: StructMemberContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.unionMember`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitUnionMember?: (ctx: UnionMemberContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.subStruct`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSubStruct?: (ctx: SubStructContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.subUnion`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSubUnion?: (ctx: SubUnionContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.varDecl`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVarDecl?: (ctx: VarDeclContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.varInit`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVarInit?: (ctx: VarInitContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.arrayDims`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitArrayDims?: (ctx: ArrayDimsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.varAssign`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVarAssign?: (ctx: VarAssignContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.lValue`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLValue?: (ctx: LValueContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.regWrite`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRegWrite?: (ctx: RegWriteContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.arrayIndexes`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitArrayIndexes?: (ctx: ArrayIndexesContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.beginEndStmt_functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeginEndStmt_functionBodyStmt?: (ctx: BeginEndStmt_functionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.beginEndStmt_actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeginEndStmt_actionStmt?: (ctx: BeginEndStmt_actionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.beginEndStmt_actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeginEndStmt_actionValueStmt?: (ctx: BeginEndStmt_actionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.beginEndStmt_moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeginEndStmt_moduleStmt?: (ctx: BeginEndStmt_moduleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.beginEndStmt_expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeginEndStmt_expressionStmt?: (ctx: BeginEndStmt_expressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.if_functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIf_functionBodyStmt?: (ctx: If_functionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.if_actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIf_actionStmt?: (ctx: If_actionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.if_actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIf_actionValueStmt?: (ctx: If_actionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.if_moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIf_moduleStmt?: (ctx: If_moduleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.if_expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIf_expressionStmt?: (ctx: If_expressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.case_functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCase_functionBodyStmt?: (ctx: Case_functionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.case_actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCase_actionStmt?: (ctx: Case_actionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.case_actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCase_actionValueStmt?: (ctx: Case_actionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.case_moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCase_moduleStmt?: (ctx: Case_moduleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.case_expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCase_expressionStmt?: (ctx: Case_expressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.caseItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseItem_functionBodyStmt?: (ctx: CaseItem_functionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.caseItem_actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseItem_actionStmt?: (ctx: CaseItem_actionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.caseItem_actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseItem_actionValueStmt?: (ctx: CaseItem_actionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.caseItem_moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseItem_moduleStmt?: (ctx: CaseItem_moduleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.caseItem_expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseItem_expressionStmt?: (ctx: CaseItem_expressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.defaultItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDefaultItem_functionBodyStmt?: (ctx: DefaultItem_functionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.defaultItem_actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDefaultItem_actionStmt?: (ctx: DefaultItem_actionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.defaultItem_actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDefaultItem_actionValueStmt?: (ctx: DefaultItem_actionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.defaultItem_moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDefaultItem_moduleStmt?: (ctx: DefaultItem_moduleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.defaultItem_expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDefaultItem_expressionStmt?: (ctx: DefaultItem_expressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.while_functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWhile_functionBodyStmt?: (ctx: While_functionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.while_actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWhile_actionStmt?: (ctx: While_actionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.while_actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWhile_actionValueStmt?: (ctx: While_actionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.while_moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWhile_moduleStmt?: (ctx: While_moduleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.while_expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWhile_expressionStmt?: (ctx: While_expressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.for_functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFor_functionBodyStmt?: (ctx: For_functionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.for_actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFor_actionStmt?: (ctx: For_actionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.for_actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFor_actionValueStmt?: (ctx: For_actionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.for_moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFor_moduleStmt?: (ctx: For_moduleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.for_expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFor_expressionStmt?: (ctx: For_expressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.forInit`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitForInit?: (ctx: ForInitContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.forOldInit`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitForOldInit?: (ctx: ForOldInitContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.simpleVarAssign`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSimpleVarAssign?: (ctx: SimpleVarAssignContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.forNewInit`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitForNewInit?: (ctx: ForNewInitContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.simpleVarDeclAssign`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSimpleVarDeclAssign?: (ctx: SimpleVarDeclAssignContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.forTest`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitForTest?: (ctx: ForTestContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.forIncr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitForIncr?: (ctx: ForIncrContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.varIncr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVarIncr?: (ctx: VarIncrContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.functionDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionDef?: (ctx: FunctionDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.functionProto`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionProto?: (ctx: FunctionProtoContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.functionFormals`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionFormals?: (ctx: FunctionFormalsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.functionFormal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionFormal?: (ctx: FunctionFormalContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.functionBody`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionBody?: (ctx: FunctionBodyContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionBodyStmt?: (ctx: FunctionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.returnStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitReturnStmt?: (ctx: ReturnStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpression?: (ctx: ExpressionContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.exprPrimary`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExprPrimary?: (ctx: ExprPrimaryContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.condExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCondExpr?: (ctx: CondExprContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.condPredicate`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCondPredicate?: (ctx: CondPredicateContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.exprOrCondPattern`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExprOrCondPattern?: (ctx: ExprOrCondPatternContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.operatorExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOperatorExpr?: (ctx: OperatorExprContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.unop`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitUnop?: (ctx: UnopContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.binop`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBinop?: (ctx: BinopContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.bitConcat`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBitConcat?: (ctx: BitConcatContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.beginEndExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeginEndExpr?: (ctx: BeginEndExprContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.actionBlock`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitActionBlock?: (ctx: ActionBlockContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitActionStmt?: (ctx: ActionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.actionValueBlock`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitActionValueBlock?: (ctx: ActionValueBlockContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitActionValueStmt?: (ctx: ActionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.varDeclDo`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVarDeclDo?: (ctx: VarDeclDoContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.varDo`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVarDo?: (ctx: VarDoContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.functionCall`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionCall?: (ctx: FunctionCallContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.methodCall`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodCall?: (ctx: MethodCallContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeAssertion`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeAssertion?: (ctx: TypeAssertionContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.structExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStructExpr?: (ctx: StructExprContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.memberBind`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMemberBind?: (ctx: MemberBindContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.taggedUnionExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTaggedUnionExpr?: (ctx: TaggedUnionExprContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.interfaceExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInterfaceExpr?: (ctx: InterfaceExprContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.ruleExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRuleExpr?: (ctx: RuleExprContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.ruleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRuleStmt?: (ctx: RuleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.pattern`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPattern?: (ctx: PatternContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.constantPattern`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitConstantPattern?: (ctx: ConstantPatternContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.taggedUnionPattern`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTaggedUnionPattern?: (ctx: TaggedUnionPatternContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.structPattern`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStructPattern?: (ctx: StructPatternContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.tuplePattern`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTuplePattern?: (ctx: TuplePatternContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.casePatItem_functionBodyStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCasePatItem_functionBodyStmt?: (ctx: CasePatItem_functionBodyStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.casePatItem_actionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCasePatItem_actionStmt?: (ctx: CasePatItem_actionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.casePatItem_actionValueStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCasePatItem_actionValueStmt?: (ctx: CasePatItem_actionValueStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.casePatItem_moduleStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCasePatItem_moduleStmt?: (ctx: CasePatItem_moduleStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.casePatItem_expressionStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCasePatItem_expressionStmt?: (ctx: CasePatItem_expressionStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.caseExpr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseExpr?: (ctx: CaseExprContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.caseExprItem`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseExprItem?: (ctx: CaseExprItemContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.systemTaskStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSystemTaskStmt?: (ctx: SystemTaskStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.displayTaskName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDisplayTaskName?: (ctx: DisplayTaskNameContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.stringTaskName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStringTaskName?: (ctx: StringTaskNameContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.systemFunctionCall`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSystemFunctionCall?: (ctx: SystemFunctionCallContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.systemTaskCall`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSystemTaskCall?: (ctx: SystemTaskCallContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.stringAVTaskName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStringAVTaskName?: (ctx: StringAVTaskNameContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.attributeInstances`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAttributeInstances?: (ctx: AttributeInstancesContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.attributeInstance`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAttributeInstance?: (ctx: AttributeInstanceContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.attrSpec`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAttrSpec?: (ctx: AttrSpecContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.attrName`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAttrName?: (ctx: AttrNameContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.provisos`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitProvisos?: (ctx: ProvisosContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.proviso`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitProviso?: (ctx: ProvisoContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeclassDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeclassDef?: (ctx: TypeclassDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeclassIde`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeclassIde?: (ctx: TypeclassIdeContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typelist`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypelist?: (ctx: TypelistContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typedepends`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypedepends?: (ctx: TypedependsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typedepend`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypedepend?: (ctx: TypedependContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.overloadedDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOverloadedDef?: (ctx: OverloadedDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.typeclassInstanceDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeclassInstanceDef?: (ctx: TypeclassInstanceDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.derives`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDerives?: (ctx: DerivesContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.externModuleImport`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExternModuleImport?: (ctx: ExternModuleImportContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.importBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitImportBVIStmt?: (ctx: ImportBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.enabled_sel`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitEnabled_sel?: (ctx: Enabled_selContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.ready_sel`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitReady_sel?: (ctx: Ready_selContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.clocked_by_sel`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitClocked_by_sel?: (ctx: Clocked_by_selContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.reset_by_sel`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitReset_by_sel?: (ctx: Reset_by_selContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.parameterBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParameterBVIStmt?: (ctx: ParameterBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.methodBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMethodBVIStmt?: (ctx: MethodBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.portBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPortBVIStmt?: (ctx: PortBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.inputClockBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInputClockBVIStmt?: (ctx: InputClockBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.portsDef`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPortsDef?: (ctx: PortsDefContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.portId`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPortId?: (ctx: PortIdContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.defaultClockBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDefaultClockBVIStmt?: (ctx: DefaultClockBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.outputClockBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOutputClockBVIStmt?: (ctx: OutputClockBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.inputResetBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInputResetBVIStmt?: (ctx: InputResetBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.clockId`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitClockId?: (ctx: ClockIdContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.defaultResetBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDefaultResetBVIStmt?: (ctx: DefaultResetBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.outputResetBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOutputResetBVIStmt?: (ctx: OutputResetBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.ancestorBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAncestorBVIStmt?: (ctx: AncestorBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.sameFamilyBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSameFamilyBVIStmt?: (ctx: SameFamilyBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.scheduleBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitScheduleBVIStmt?: (ctx: ScheduleBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.operatorId`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOperatorId?: (ctx: OperatorIdContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.pathBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPathBVIStmt?: (ctx: PathBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.interfaceBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInterfaceBVIStmt?: (ctx: InterfaceBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.interfaceBVIMembDecl`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInterfaceBVIMembDecl?: (ctx: InterfaceBVIMembDeclContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.inoutBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInoutBVIStmt?: (ctx: InoutBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.resetId`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitResetId?: (ctx: ResetIdContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.noResetBVIStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNoResetBVIStmt?: (ctx: NoResetBVIStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.externCImport`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExternCImport?: (ctx: ExternCImportContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.cFuncArgs`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCFuncArgs?: (ctx: CFuncArgsContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.cFuncArg`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCFuncArg?: (ctx: CFuncArgContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.fsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFsmStmt?: (ctx: FsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.exprFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExprFsmStmt?: (ctx: ExprFsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.seqFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSeqFsmStmt?: (ctx: SeqFsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.parFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParFsmStmt?: (ctx: ParFsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.ifFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIfFsmStmt?: (ctx: IfFsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.whileFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWhileFsmStmt?: (ctx: WhileFsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.forFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitForFsmStmt?: (ctx: ForFsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.returnFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitReturnFsmStmt?: (ctx: ReturnFsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.repeatFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRepeatFsmStmt?: (ctx: RepeatFsmStmtContext) => Result;

	/**
	 * Visit a parse tree produced by `bsvParser.loopBodyFsmStmt`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLoopBodyFsmStmt?: (ctx: LoopBodyFsmStmtContext) => Result;
}

