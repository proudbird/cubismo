import { Types } from "./Types";

export type Parameter = {
  name: string,
  types: Types[]|string[],
  value?: string
}