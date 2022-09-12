export default class Iterable<T> {

  #entries: any[];

  constructor(entries: any[]) {
    this.#entries = entries;
  }

  [Symbol.iterator] = () => {

    let count = 0;
    let done = false;

    let next = () => {
       if(count >= this.#entries.length) {
          done = true;
       }
       return { done, value: this.#entries[count++] };
    }

    return { next };
  }

  forEach(): void {

  }

  map(): void {
    
  }
}