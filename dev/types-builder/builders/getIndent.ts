import Symbols from './Symbols';

export default function getIndent(level: number = 1): string {

  let indent: string = '';
  for(let i = 1; i <= level; i++) {
    indent += Symbols.TAB;
  }

  return indent;
}