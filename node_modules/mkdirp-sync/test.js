const mkdir = require('./index')

const relative_path = 'foo/bar/baz'
const absolute_path = '/usr/local/nginx/html/project/example'

mkdir(relative_path)
mkdir(absolute_path)