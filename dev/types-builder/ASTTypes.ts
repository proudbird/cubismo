export enum Type {
  Void      = 'void',
  Any       = 'any',
  String    = 'string',
  Number    = 'number',
  Boolean   = 'boolean',
  Null      = 'Null',
  Undefined = 'Undefined',
  Array     = '[]'
}

export enum TypeDescription {
  TSAnyKeyword                  = "TSAnyKeyword",
  TSStringKeyword               = "TSStringKeyword",
  TSNumberKeyword               = "TSNumberKeyword",
  TSBooleanKeyword              = "TSBooleanKeyword",
  TSNullKeyword                 = "TSNullKeyword",
  TSUndefinedKeyword            = "TSUndefinedKeyword",
  TSArrayType                   = "TSArrayType",
  TSTypeReference               = "TSTypeReference",
  TSQualifiedName               = "TSQualifiedName",
  TSTypeParameterInstantiation  = "TSTypeParameterInstantiation",
  TSUnionType                   = "TSUnionType",
  Identifier                    = "Identifier",
  Promise                       = "Promise",
  AssignmentPattern             = "AssignmentPattern"
}

export const TypeDictionary = {
  TSVoidKeyword     : Type.Void,
  TSAnyKeyword      : Type.Any,
  TSStringKeyword   : Type.String,
  TSNumberKeyword   : Type.Number,
  TSBooleanKeyword  : Type.Boolean,
  TSNullKeyword     : Type.Null,
  TSUndefinedKeyword: Type.Undefined,
  TSArrayType       : Type.Array,
}

export type ASTBranche = {
  type            : TypeDescription,
  name?           : string,
  left?           : ASTBranche,
  right?          : ASTBranche,
  typeAnnotation? : ASTBranche,
  types?          : ASTBranche[],
  typeName?       : ASTBranche,
  typeParameters? : ASTBranche,
  elementType?    : ASTBranche,
  params          : ASTBranche[],
}