
# numerator [![Build Status](http://github.com/proudbird/numerator)] #

A simple script, that increments serial numbers, containing non-digit symbols

## Quickstart

```shell
npm install numerator
```

Then make reference inside yor module...

```javascript
const numerator = require('numerator');

// ... start numeration from begining with given template
numerator.next('IN/2019/000'); // ⇨ 'IN/2019/001'

// ... or get next of the given number
numerator.next('IN/2019/056'); // ⇨ 'IN/2019/057'

```

## API

```javascript
const numerator = require('numerator');

// Incantations
next(number);
```

Generate and return next number based on given number.

* `number` - (String | Number) A number, that must be icremented

Returns `number`

```
## Testing

```shell
npm test
```