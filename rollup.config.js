const resolve = require('rollup-plugin-node-resolve');
const babel  = require('rollup-plugin-babel');
const commonjs  = require('rollup-plugin-commonjs');
const builtins  = require('rollup-plugin-node-builtins');

module.exports = function(cli){
  const name = "main";
  const outname = "bundle";
	return {
    input: `${__dirname}/client/js/sources/${name}.js`,
    plugins: [
      commonjs({
        include: 'node_modules/**'
      }),
      resolve(),
      babel()
    ],
    external: ['webix'],
		output: {
      file: `${__dirname}/client/js/${outname}.js`,
      format: "iife",

		},
		watch:{
			chokidar: false
		}
	};
};