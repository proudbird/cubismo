export enum Types {
  Void = 'void',
  Any = 'any',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Null = 'Null',
  Undefined = 'Undefined',
  Array = '[]'
}

export function print(types: string[]|Types[]) {
  const result: string[] = [];
  for(let t of types) {
    result.push(t);
  }
  return result.length ? `: ${result.join(' | ')}` : '';
}