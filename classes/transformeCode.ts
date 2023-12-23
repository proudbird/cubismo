import { Output, transformSync } from '@swc/core';

export default function transformCode(
  filename: string, 
  source: string, 
  sourseMaps: boolean = false
): Output {
  
  const result = transformSync(source, {
    filename,
    sourceMaps: sourseMaps ? 'inline' : false,
    module: {
      type: 'commonjs',
      strictMode: false,
    },
    isModule: true,
  }) as Output;

  return result;
}
