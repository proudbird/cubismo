
# numerator #

A simple script, that increments serial numbers, containing non-digit symbols

Useful for numbering documents, catalogs, users and etc.

## Quickstart

```shell
npm install numerator
```

Then make reference inside yor module...

```javascript
const numerator = require('numerator');

// ... start numeration from begining with given template
numerator.next('IN/2019/000'); // ⇨ 'IN/2019/001'

// ... or to get next of the given number
numerator.next('IN/2019/056'); // ⇨ 'IN/2019/057'

// ... to get first number with only given prefix
numerator.next('USER-', true); // ⇨ 'USER-1'

// ... or to get next number with expanding template
numerator.next('USER-99', true); // ⇨ 'USER-100'

```

## API

### next(num, [expand])

Generates and returns next number based on given number

#### Arguments

* `num` - (string | number) A number, that must be icremented
* `expand` - (boolen) optional; `true`, if we want to expand number template (to increase its lenght) in case, when quantity of digits of the number must be increased; by default it is `false`

Note: if you pass "USER-99" as `num` and `expand` is `false`, it will throw Error (not returns "USER-100"), so if you need "USER-100", `expand` mast be `true`

#### Returns 
`number` - result of inrementing

## Testing

```shell
npm test
```

## License

[MIT](./LICENSE)