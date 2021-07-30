class Signal {

  #signals: WeakMap<any, any>

  constructor() {
    this.#signals = new WeakMap()
  }

  on(instance, callback) {
    this.#signals.set(instance, callback)
  }

  emit(instance, value) {
    if(this.#signals.has(instance)) {
      const callback = this.#signals.get(instance)
      callback(value)
    }
  }
}