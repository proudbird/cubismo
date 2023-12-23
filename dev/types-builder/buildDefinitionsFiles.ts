import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { get } from "lodash";
import { AppMemberDefinition, DataType, EnumDefinition, MetaDataObjectAttribute, ModuleType, ModuleTypeDictionary } from "./MetaDataTypes";
import { ASTBranche, TypeDescription, TypeDictionary } from "./ASTTypes";
import Interface from "./builders/Interface";
import Class from "./builders/Class";
import Namespace from "./builders/Namespace";
import Module from "./builders/Module";
import Type from "./builders/Type";
import Symbols from './builders/Symbols';

import { Program, Parameter } from "@typescript-eslint/types/dist/generated/ast-spec";
import ObjectVariable from "./builders/ObjectVariable";
import { AppMember, ApplicationStructure, ModelStructure } from "../../classes/application/defineAppStructure";
import { CatalogModelDefinition, ModelDefinition } from "../../database/types";
import Logger from "../../common/Logger";

const AppClasses = [
  'Modules',
  'Constants',
  'Catalogs',
  'Registrators',
  'DataSets',
  'Enums',
  'Types',
  'Views',
]

const AppObjectMembersDictionary = {
  Constants: 'Value',
  Catalogs: 'Instance',
  Registrators: 'Registrator',
  DataSets: 'Record',
  Collections: 'Item'
}

interface BuilderOptions {
  appStructure: ApplicationStructure;
  modelStructure: ModelStructure;
}

export default function buildDefinitionsFiles(options: BuilderOptions) {
  
  const appTree = options.appStructure;
  const appModels = options.modelStructure;
  
  const allCubesPaths: string[] = [];
  
  
  const typesDir = join(__dirname, '_types');
  
  const appIndex: string[] = [];
  
  const appClass = new Class('Application', 'ApplicationBaseClass');

  let declarations: string[] = [];
  
  for(let [cubeName, cube] of Object.entries(appTree.cubes)) {

    const cubeDir = join(appTree.path, cubeName);

    const appMember = new AppMemberDefinition(
      ModuleType.Cube,
      cubeName,
      undefined,
      undefined,
      cubeName,
      cube.module
    );

    allCubesPaths.push(`./${appMember.name}`);

    appClass.addProperty(cubeName, [`${appMember.name}`], '', true);

    // if(!appMember.astTree) {
    //   continue;
    // }
  
    const memberTypeDefinitions = getAppTypeDefinition(appMember.astTree);
    defineComments(appMember.astTree, memberTypeDefinitions);

    defineCubeTypes(cubeName, cube, cubeDir, appModels);

    //declarations = declarations.concat(defineTypeDeclarations(appMember.astTree, appMember.source));
    
    const interfaceCube = new Interface('Cube');
    for( let className of AppClasses) {
      interfaceCube.addProperty(className, [className]);
    }
    
    for(let memberDefinition of memberTypeDefinitions) {
      if(memberDefinition.isMethod) {
        interfaceCube.addMethod(
          memberDefinition.name, 
          memberDefinition.params, 
          memberDefinition.returns, 
          memberDefinition.description, 
          false);
      } else {
        interfaceCube.addProperty(
          memberDefinition.name, 
          memberDefinition.types, 
          memberDefinition.description, 
          false);
      }
    }

    const cubeClass = new Class(appMember.name);
    const cubeNamespace = new Namespace(`${appMember.name}`);

    const cubeClassInterfaces = {};
    const cubeClassModules = {};
    const views = { Views: [] };
    for( let className of AppClasses) {
      cubeClass.addProperty(className, [`${appMember.name}.${className}`], '', true);
      cubeClassInterfaces[className] = new Interface(className);
      cubeNamespace.interfaces.push(cubeClassInterfaces[className]);
      cubeClassModules[className] = new Module(className);
      cubeNamespace.modules.push(cubeClassModules[className]);
    }

    for(let cubeMember of appMember.members) {
      if(cubeMember.moduleType === 'module') {
        cubeClassInterfaces[cubeMember.metaDataClassName!].addProperty(cubeMember.name, [`${cubeMember.metaDataClassName}.${cubeMember.name}`]);
        const moduleInterface = new Interface(cubeMember.name, 'Module');
        addModuleMembers(moduleInterface, cubeMember.astTree);
        cubeClassModules[cubeMember.metaDataClassName!].interfaces.push(moduleInterface);
      } else if(cubeMember.moduleType === 'enum') {
        cubeClassInterfaces[cubeMember.metaDataClassName!].addProperty(cubeMember.name, [`${cubeMember.metaDataClassName}.${cubeMember.name}`]);
        const enumInterface = new Interface(cubeMember.name, 'Enum');
        addEnumValues(enumInterface, (cubeMember.metaDataObjectDefinition! as EnumDefinition));
        const enumModule = new Module(cubeMember.name);
        const valueInterface = new Interface(`Value`);
        enumModule.interfaces.push(valueInterface);
        cubeClassModules[cubeMember.metaDataClassName!].interfaces.push(enumInterface);
        cubeClassModules[cubeMember.metaDataClassName!].modules.push(enumModule);
      } else if(cubeMember.moduleType === 'type') {
        
        const type = new Type(cubeMember.name, (cubeMember.metaDataObjectDefinition! as any));
        cubeClassModules[cubeMember.metaDataClassName!].types.push(type);
      } else if(cubeMember.moduleType === 'constant') {
        cubeClassInterfaces[cubeMember.metaDataClassName!].addProperty(cubeMember.name, [`${cubeMember.metaDataClassName}.${cubeMember.name}.Manager`]);
        const objectModule = new Module(cubeMember.name);
        const itemMark = AppObjectMembersDictionary[cubeMember.metaDataClassName!];
        const itemInterface = new Interface(itemMark);
        addCatalogInstanceMembers(itemInterface, (cubeMember.metaDataObjectDefinition! as CatalogModelDefinition), appModels);
        addCollections(objectModule, itemInterface, (cubeMember.metaDataObjectDefinition! as CatalogModelDefinition), appModels);
        const managerInterface = new Interface('Manager', `${cubeMember.metaDataClassName}Manager<${itemMark}>`);
        objectModule.interfaces.push(itemInterface, managerInterface);
        addManagerMembers(itemInterface, cubeMember.astTree);
        cubeClassModules[cubeMember.metaDataClassName!].modules.push(objectModule);
      } else if(cubeMember.moduleType === 'view') {
        // cubeClassInterfaces[cubeMember.metaDataClassName!].addProperty(cubeMember.name, [`${cubeMember.metaDataClassName}.${cubeMember.name}`]);
        const viewVar = new ObjectVariable(cubeMember.name, 'View');
        for(let prop of cubeMember.properties) {
          viewVar.addProperty(
            prop.name, 
            [prop.type], 
            undefined,
            false);
        }
        views[cubeMember.metaDataClassName!].push(viewVar);
      } else {
        cubeClassInterfaces[cubeMember.metaDataClassName!].addProperty(cubeMember.name, [`${cubeMember.metaDataClassName}.${cubeMember.name}.Manager`]);
        const objectModule = new Module(cubeMember.name);
        const itemMark = AppObjectMembersDictionary[cubeMember.metaDataClassName!];
        const itemInterface = new Interface(itemMark, `${cubeMember.metaDataClassName}${itemMark}<${itemMark}>`);
        addCatalogInstanceMembers(itemInterface, (cubeMember.metaDataObjectDefinition! as CatalogModelDefinition), appModels);
        addCollections(objectModule, itemInterface, (cubeMember.metaDataObjectDefinition! as CatalogModelDefinition), appModels);
        const managerInterface = new Interface('Manager', `${cubeMember.metaDataClassName}Manager<${itemMark}>`);
        objectModule.interfaces.push(itemInterface, managerInterface);
        addManagerMembers(itemInterface, cubeMember.astTree);
        cubeClassModules[cubeMember.metaDataClassName!].modules.push(objectModule);
      }
    }

    const classTypeDefinitions = getAppTypeDefinition(appMember.astTree);
    defineComments(appMember.astTree, classTypeDefinitions);
    
    for(let memberDefinition of classTypeDefinitions) {
      if(memberDefinition.isMethod) {
        cubeClass.addMethod(
          memberDefinition.name, 
          memberDefinition.params, 
          memberDefinition.returns, 
          memberDefinition.description, 
          true);
      } else {
        cubeClass.addProperty(
          memberDefinition.name, 
          memberDefinition.types, 
          memberDefinition.description, 
          true);
      }
    }
    ////////

    appIndex.push(cubeClass.print(0));
    appIndex.push(cubeNamespace.print(0));
  }
  
  // const memberTypeDefinitions = getAppTypeDefinition(appTree.astTree);
  // defineComments(appTree.astTree, memberTypeDefinitions);
  
  // for(let memberDefinition of memberTypeDefinitions) {
  //   if(memberDefinition.isMethod) {
  //     appClass.addMethod(
  //       memberDefinition.name, 
  //       memberDefinition.params, 
  //       memberDefinition.types, 
  //       memberDefinition.description, 
  //       true);
  //   } else {
  //     appClass.addProperty(
  //       memberDefinition.name, 
  //       memberDefinition.types, 
  //       memberDefinition.description, 
  //       true);
  //   }
  // }

  const cubeViews = { Views: [] };


  appIndex.splice(0,0,appClass.print(0));
  // appIndex.splice(0,0,'/// <reference path="./_ui.d.ts" />\n');
  appIndex.splice(0,0,'/// <reference path="./_addIns.d.ts" />\n');
  appIndex.splice(0,0,'/// <reference path="./_cubismo.d.ts" />\n');
  // appIndex.splice(0,0,'/// <reference path="./_types.d.ts" />\n');


  for(let [cubeName] of Object.entries(appTree.cubes)) {

    const fileName = join(appTree.path, cubeName, `types.d.ts`)
    if(existsSync(fileName)) {
      appIndex.splice(0,0,`/// <reference path="./${cubeName}/types.d.ts" />\n`);
    }
  }

  const appDir = appTree.path;
  writeFileSync(join(appDir, '_index.d.ts'), appIndex.join(Symbols.NEW_LINE));

  const tsConfigFilePath = join(__dirname, 'templates', 'tsconfig.json');
  const tsConfig = require(tsConfigFilePath);
  const references: any[] = [];
  for(let path of allCubesPaths) {
    references.push({
      path: path
    })
  }
  tsConfig.exclude = allCubesPaths;
  tsConfig.exclude.push("./Views", 'tsconfig.json');
  tsConfig.references = references;
  writeFileSync(join(appTree.path, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2), 'utf-8');

  //writeFileSync(join(appTree.dir, '_types.d.ts'), declarations.join(Symbols.NEW_LINE));

  const cubismoTypesFilePath = join(appTree.path, '_cubismo.d.ts');
  const addInsTypesFilePath = join(appTree.path, '_addIns.d.ts');

  if(!existsSync(cubismoTypesFilePath)) {
    writeFileSync(cubismoTypesFilePath, readFileSync(join(__dirname, 'templates', '_cubismo.d.ts').replace('.dist/', ''), 'utf-8'));
  }

  if(!existsSync(addInsTypesFilePath)) {
    writeFileSync(addInsTypesFilePath, readFileSync(join(__dirname, 'templates', '_addIns.d.ts').replace('.dist/', ''), 'utf-8'));
  }

  Logger.info(`Definitions files are re-built`);
}

function addModuleMembers(moduleInterface: Interface | ObjectVariable, astTree): void {
  const memberTypeDefinitions = getAppTypeDefinition(astTree);
  defineComments(astTree, memberTypeDefinitions);
  
  for(let memberDefinition of memberTypeDefinitions) {
    if(memberDefinition.isMethod) {
      (moduleInterface as Interface).addMethod(
        memberDefinition.name, 
        memberDefinition.params, 
        memberDefinition.returns, 
        memberDefinition.description, 
        false);
    } else {
      moduleInterface.addProperty(
        memberDefinition.name, 
        memberDefinition.types, 
        memberDefinition.description, 
        false);
    }
  }
}

function addManagerMembers(moduleInterface: Interface, astTree): void {
  addModuleMembers(moduleInterface, astTree);
}

function addCatalogInstanceMembers(itemInterface: Interface, definition: CatalogModelDefinition, appModels): void {
  for(let key in definition.attributes) {
    const types = getAttributeTypes((definition.attributes[key] as MetaDataObjectAttribute), definition, appModels);
    itemInterface.addProperty(key, [types]);
  }
}

function addCollections(classModule: Module, instanceInterface: Interface, definition: CatalogModelDefinition, appModels) {
  for(let key in definition.collections) {
    const collectionDefinition = definition.collections[key];
    instanceInterface.addProperty(collectionDefinition.name, [`Collections<${definition.name}.Collections.${collectionDefinition.name}.Item>`]);
    const collectionsModule = new Module('Collections');
    classModule.modules.push(collectionsModule);
    const collectionModule = new Module(collectionDefinition.name);
    collectionsModule.modules.push(collectionModule);
    const itemMark = AppObjectMembersDictionary['Collections'];
    const itemInterface = new Interface(itemMark, `Collections${itemMark}${instanceInterface.name}<${instanceInterface.name}>`);
    for(let key in collectionDefinition.attributes) {
      const types = getAttributeTypes((collectionDefinition.attributes[key] as MetaDataObjectAttribute), definition, appModels);
      itemInterface.addProperty(key, [types]);
    }
    collectionModule.interfaces.push(itemInterface);
  }
}

const MetaDataTypesDictionary = {
  [DataType.String]: 'string',
  [DataType.Number]: 'number',
  [DataType.Boolean]: 'boolean',
  [DataType.Date]: 'Date'
}

function getAttributeTypes(attributeDefinition: MetaDataObjectAttribute, modelDefinition, appModels): string {
  let result = '';
  const typesDescription = attributeDefinition.type;
  if(typesDescription.dataType === DataType.Reference) {
    const referenceName = getReferenceNameById(typesDescription.reference!.modelId, appModels);
    let cubeName = `${typesDescription.reference!.cube}.`;
    if(cubeName === 'this.') {
      cubeName = '';
    }
    const itemMark = AppObjectMembersDictionary[typesDescription.reference!.class];
    result = `${cubeName}${typesDescription.reference!.class}.${referenceName}.${itemMark}`;
  } else {
    result = MetaDataTypesDictionary[typesDescription.dataType];
  }
  
  return result;
}

function getReferenceNameById(modelId: string, appModels: Map<string , any>): string {
  const reference = appModels.get(modelId);
  return reference.name;
}

function addEnumValues(itemInterface: Interface, definition: EnumDefinition): void {
  for(let value of definition.values) {
    itemInterface.addProperty(value.name, [itemInterface.name]);
  }
}

type Params = {
  name: string,
  types: string[]
}

type MemberTypeDefinition = {
  name        : string,
  types       : string[],
  isMethod    : boolean,
  params      : Params[],
  returns     : string[],
  start       : number,
  end         : number,
  description?: string,
}

function getAppTypeDefinition(astTree: Program): MemberTypeDefinition[] {

  if(!astTree) {
    return [];
  }

  const classMembers: MemberTypeDefinition[] = [];
  for(let statement of astTree.body) {
    // we need only expressions with 'this' assigment
    if(get(statement, 'expression.type') === 'TSAsExpression' && get(statement, 'expression.expression.object.type') === "ThisExpression") {
      const propertyName: string = get(statement, 'expression.expression.property.name');
      const propertyTypes: string[] = getTypes(get(statement, 'expression.typeAnnotation'));

      classMembers.push({
        name: propertyName,
        types: propertyTypes,
        isMethod: false,
        params: [],
        returns:  [], 
        start: statement.loc.start.line,
        end: statement.loc.end.line,
      });
      continue;
    } else if(get(statement, 'expression.left.type') === 'TSAsExpression' && get(statement, 'expression.left.expression.object.type') === "ThisExpression") {
        const propertyName: string = get(statement, 'expression.left.expression.property.name');
        const propertyTypes: string[] = getTypes(get(statement, 'expression.left.typeAnnotation'));
  
        classMembers.push({
          name: propertyName,
          types: propertyTypes,
          isMethod: false,
          params: [],
          returns:  [], 
          start: statement.loc.start.line,
          end: statement.loc.end.line,
        });
        continue;
    } else if(get(statement, 'expression.left.object.name') === "me") {
        // const propertyName: string = get(statement, 'expression.left.property.name');
        // const propertyTypes: string[] = getTypes(get(statement, 'expression.left.typeAnnotation'));
  
        // classMembers.push({
        //   name: propertyName,
        //   types: propertyTypes,
        //   isMethod: false,
        //   params: [],
        //   returns:  [], 
        //   start: statement.loc.start.line,
        //   end: statement.loc.end.line,
        // });
        continue;
    } else if(get(statement, 'type') === 'ExportNamedDeclaration' && get(statement, 'declaration.type') === 'FunctionDeclaration') {
      const propertyName: string = get(statement, 'declaration.id.name');
      const propertyTypes: string[] = getTypes({} as ASTBranche);
      const params: Params[] = [];
      const returns: string[] = getTypes(get(statement, 'declaration.returnType.typeAnnotation'));
      let isMethod = true;
      const declarationParams = get(statement, 'declaration.params') || [];
      for(let param of declarationParams) {
        const paramDefinition = getParamDefinition(param);
        params.push(paramDefinition);
      }

      classMembers.push({
        name: propertyName,
        types: propertyTypes,
        isMethod,
        params,
        returns, 
        start: statement.loc.start.line,
        end: statement.loc.end.line,
      });
      continue;
    } else if(get(statement, 'type') === 'ExportDefaultDeclaration' && get(statement, 'declaration.type') === 'ObjectExpression') {
      const declarationProps = get(statement, 'declaration.properties') || [];
      for(let prop of declarationProps) {
        const propertyName: string = get(prop, 'key.name');
        const propertyTypes: string[] = [
          get(get(prop, 'value.properties')?.
          find(p => get(p, 'key.name') === 'type'), 'value.value')];

        classMembers.push({
          name: propertyName,
          types: propertyTypes,
          isMethod: false,
          params: [],
          returns: [], 
          start: statement.loc.start.line,
          end: statement.loc.end.line,
        });
      }
      
      continue;
    } else {
      if(get(statement, 'expression.left.object.type') !== 'ThisExpression') {
        continue;
      }
    } 

    const propertyName: string = get(statement, 'expression.left.property.name');
    const propertyTypes: string[] = getTypes(get(statement, 'expression.left.typeAnnotation'));
    const params: Params[] = [];
    const returns: string[] = getTypes(get(statement, 'expression.right.returnType.typeAnnotation'));
    let isMethod = false;

    if(get(statement, 'expression.right.type') === 'FunctionExpression') {
      isMethod = true;
      const params = get(statement, 'expression.right.params') || [];
      for(let param of params) {
        const paramDefinition = getParamDefinition(param);
        params.push(paramDefinition);
      }
    }

    classMembers.push({
      name: propertyName,
      types: propertyTypes,
      isMethod,
      params,
      returns, 
      start: statement.loc.start.line,
      end: statement.loc.end.line,
    });
  }

  return classMembers;
}

function getParamDefinition(param) {
  let result;
  let optionalClause = '';
  if(param.optional) {
    optionalClause= '?';
  }
  if(param.type === TypeDescription.AssignmentPattern) {
    result = {
      name: `${param.left.name}${optionalClause}`,
      types: getTypes(get(param.left, 'typeAnnotation.typeAnnotation')),
      value: param.right.raw
    }
  } else {
    result = {
      name: `${param.name}${optionalClause}`,
      types: getTypes(get(param, 'typeAnnotation.typeAnnotation'))
    }
  }

  return result;
}

function getTypes(typeAnnotation: ASTBranche): string[] {
  if(!typeAnnotation) {
    return [];
  }
  let result: string[] = [];
  if(typeAnnotation.type === TypeDescription.TSTypeReference) {
    const type: string[] = [];
    const params: any[] = [];
    if(typeAnnotation.typeParameters) {
      for(let param of typeAnnotation.typeParameters.params) {
        params.push(getTypes(param));
      }
    }
    let typeDescription = typeAnnotation.typeName!.left ? getLeft(typeAnnotation.typeName!.left) : typeAnnotation.typeName!.name!;
    if(params.length) {
      typeDescription = `${typeDescription}<${params.join(', ')}>`;
    }
    type.push(typeDescription);
    
    if(typeAnnotation.typeName!.right) {
      const typeAlias = get(TypeDictionary, 'typeAnnotation.typeName.right.name') || get(typeAnnotation, 'typeName.right.name');
      type.push(typeAlias);
    }
    result.push(type.join('.'));
  } else if(typeAnnotation.type === TypeDescription.TSUnionType) {
    const types: any[] = [];
    for(let type of typeAnnotation.types!) {
      types.push(getTypes(type));
    }
    result.push(types.join(' | '));
  } else if(typeAnnotation.type === TypeDescription.TSArrayType) {
    let elementType = '';
    if(typeAnnotation.elementType) {
      elementType = getTypes(typeAnnotation.elementType).join(' | ');
    }
    result.push(`${elementType}${TypeDictionary[typeAnnotation.type]}`);
  } else {
    result.push(TypeDictionary[typeAnnotation.type]);
  }

  return result;
}

function getLeft(typeName: ASTBranche): string {
  let result: string[] = [];
  result.push(typeName.left ? getLeft(typeName.left!) : typeName.name!);
  if(typeName.right) {
    const typeAlias = get(TypeDictionary, 'typeName.right.name') || get(typeName, 'right.name');
    result.push(typeAlias);
  }

  return result.join('.');
}

function defineComments(astTree: any, classMemers: any) {

  if(!astTree) {
    return;
  }

  const classComments: any[] = [];
  const usedMembers: Set<any> = new Set();
  const usedComments: Set<any> = new Set();
  for(let comment of astTree.comments) {
    for(let member of classMemers) {
      if(comment.loc.end.line < member.start && comment.type === 'Block' && !usedMembers.has(member) && !usedComments.has(comment)) {
        usedMembers.add(member);
        usedComments.add(comment);
        member.description = comment.value;
      }
    }
  }
}

function defineCubeTypes(cubeName: string, cube: AppMember, cubeDir: string, appModels: ModelStructure) {
  
  const cubeIndex: string[] = [];

  const classNamespace = new Namespace(cubeName);

  const classClasses = {};
  const classNamespaces = {};
  const classModules = {};
  const views: { Views: { variable: ObjectVariable, name: string }[]} = { Views: [] as { variable: ObjectVariable, name: string }[] };
  for( let className of AppClasses) {
    classClasses[className] = new Class(className);
    //classNamespaces[className] = new Namespace(`${appMember.name}`);
    classModules[className] = new Module(className);
    classNamespace.modules.push(classModules[className]);
  }
  
  cube.Views = {} as AppMember;
  const viewsDir = join(cubeDir, 'Views');

  if(!existsSync(viewsDir)) {
    return;
  }

  for(let filename of readdirSync(viewsDir)) {
    const viewName = filename.replace('.ts', '');
    cube.Views[viewName] = {} as AppMember;
  }

  for(let [className, classObject] of Object.entries(cube)) {
    if(['module', 'clientModule'].includes(className)) {
      continue;
    }

    
    for(let [objectName, object] of Object.entries(classObject)) {
      const model = appModels[`${cubeName}.${className}.${objectName}`];

      const cubeMember = new AppMemberDefinition(
        ModuleTypeDictionary[className],
        cubeName,
        className,
        model?.definition,
        objectName,
        (object as AppMember).module,
        cubeDir
      );
  
      if(cubeMember.moduleType === 'module') {
        classClasses[cubeMember.metaDataClassName].addProperty(cubeMember.name, [`${cubeName}.${cubeMember.metaDataClassName}.${cubeMember.name}`], cubeMember.description, true);
        const moduleInterface = new Interface(cubeMember.name, 'Module');
        addModuleMembers(moduleInterface, cubeMember.astTree);
        classModules[cubeMember.metaDataClassName].interfaces.push(moduleInterface);
      } else if(cubeMember.moduleType === 'enum') {
        classClasses[cubeMember.metaDataClassName].addProperty(cubeMember.name, [`${cubeName}.${cubeMember.metaDataClassName}.${cubeMember.name}`], cubeMember.description, true);
        const enumInterface = new Interface(cubeMember.name, 'Enum');
        addEnumValues(enumInterface, (cubeMember.metaDataObjectDefinition! as EnumDefinition));
        classModules[cubeMember.metaDataClassName].interfaces.push(enumInterface);
      } else if(cubeMember.moduleType === 'type') {
        
        // const type = new Type(cubeMember.name, (cubeMember.metaDataObjectDefinition! as any));
        // classModules[cubeMember.metaDataClassName].types.push(type);
      }  else if(cubeMember.moduleType === 'constant') {
        classClasses[cubeMember.metaDataClassName].addProperty(cubeMember.name, [`${cubeName}.${cubeMember.metaDataClassName}.${cubeMember.name}.Manager`], cubeMember.description, true);
        const objectModule = new Module(cubeMember.name);
        const itemMark = AppObjectMembersDictionary[cubeMember.metaDataClassName!];
        const itemInterface = new Interface(itemMark);
        //addCatalogInstanceMembers(itemInterface, (cubeMember.metaDataObjectDefinition! as CatalogDefinition), appModels);
        //addCollections(objectModule, itemInterface, (cubeMember.metaDataObjectDefinition! as CatalogDefinition), appModels);
        const managerInterface = new Interface('Manager', `${cubeMember.metaDataClassName}Manager<${itemMark}>`);
        addManagerMembers(managerInterface, cubeMember.astTree);
        objectModule.interfaces.push(itemInterface, managerInterface);
        classModules[cubeMember.metaDataClassName].modules.push(objectModule);
      } else if(cubeMember.moduleType === 'view') {
        const viewVar = new ObjectVariable('View', 'View');
        for(let prop of cubeMember.properties) {
          viewVar.addProperty(
            prop.name, 
            [prop.type], 
            undefined,
            false);
        }
        views[cubeMember.metaDataClassName].push({ variable: viewVar, name: cubeMember.name });
      } else {
        classClasses[cubeMember.metaDataClassName].addProperty(cubeMember.name, [`${cubeName}.${cubeMember.metaDataClassName}.${cubeMember.name}.Manager`], cubeMember.description, true);
        const objectModule = new Module(cubeMember.name);
        const itemMark = AppObjectMembersDictionary[cubeMember.metaDataClassName!];
        const itemInterface = new Interface(itemMark, `${cubeMember.metaDataClassName}${itemMark}<${itemMark}>`);
        //addCatalogInstanceMembers(itemInterface, (cubeMember.metaDataObjectDefinition! as CatalogDefinition), appModels);
        //addCollections(objectModule, itemInterface, (cubeMember.metaDataObjectDefinition! as CatalogDefinition), appModels);
        const managerInterface = new Interface('Manager', `${cubeMember.metaDataClassName}Manager<${itemMark}>`);
        addManagerMembers(managerInterface, cubeMember.astTree);
        objectModule.interfaces.push(itemInterface, managerInterface);
        classModules[cubeMember.metaDataClassName].modules.push(objectModule);
      }
    }
  }

  for(let name of AppClasses) {
    cubeIndex.push(classClasses[name].print(0));
  }

  cubeIndex.push(classNamespace.print(0));
  cubeIndex.splice(0,0,'/// <reference path="../_index.d.ts" />\n');
  writeFileSync(join(cubeDir, '_index.d.ts'), cubeIndex.join(Symbols.NEW_LINE));

  const tsConfigFilePath = join(__dirname, 'templates', 'tsconfig.json');
  const tsConfig = require(tsConfigFilePath);
  tsConfig.exclude = ["./Views"];
  delete tsConfig.references;
  writeFileSync(join(cubeDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

  const pathToUimo = join(__dirname, '../../../../uimo-pwa');
  for(let view of views.Views) {
    let viewIndex: string[] = [];
    viewIndex.push(`/// <reference types="${pathToUimo}" />`);
    viewIndex.push('/// <reference path="../../../_index.d.ts" />');
    viewIndex.push('\ndeclare namespace React { \n\tnamespace JSX { \n\t\tinterface IntrinsicElements extends Uimo.JSX.IntrinsicElements {} \n\t}\n}\n');
    viewIndex.push(view.variable.print(0));
    writeFileSync(join(cubeDir, 'Views', view.name, '_index.d.ts'), viewIndex.join(Symbols.NEW_LINE));
    writeFileSync(join(cubeDir, 'Views', view.name, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
  }

}

function defineTypeDeclarations(astTree: Program, source: string): string[] {

  const declarations: string[] = [];
  for(let statement of astTree.body) {
    // we need only expressions with 'TSTypeAliasDeclaration' assigment
    if(statement.type === 'TSTypeAliasDeclaration' 
    || statement.type === 'TSEnumDeclaration'
    || statement.type === 'TSInterfaceDeclaration'
    || statement.type === 'ClassDeclaration') {
      const declarationRange = source.slice(statement.range[0], statement.range[1]);
      declarations.push(`${declarationRange}\n`);
    }
  }

  return declarations;
}