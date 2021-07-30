export default class UIElement {

  #config: any
  #name  : string

  constructor(config: any) {
    this.#config = config
    this.#name   = config.name
  }

  get name(): string {
    return this.#name
  }
}