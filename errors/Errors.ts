export class CubismoError extends Error {

  constructor(message: string) {
    super(message);
  }
}

export class RangeErrors {

  static MAX_LENGTH_EXCEEDED = new RangeError("Max string length exceeded");
  static CAN_NOT_BE_NEGATIVE = new RangeError("Value can't be negative");
  static INDEX_OUT_OF_RANGE  = new RangeError("Index is out of range");
}

export class CollectionErrors {

}

export class SyntaxErrors {

  static IDENTIFICATOR_
}