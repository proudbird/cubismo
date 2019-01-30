# mkdirp-sync

> mkdir -p sync in node.js

## Install

```bash
npm install mkdirp-sync --save
yarn add mkdirp-sync
```


## Usage

```javascript
const mkdir = require('mkdirp-sync');
mkdir('foo/bar/baz');
```

folders are created as follows, same as running `fs.mkdirSync` recursively.


```bash
|____foo
| |____bar
| | |____baz

```
## License

MIT