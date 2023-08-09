#!/usr/bin/env node

import { program, Command } from 'commander';
import { run, listInstancies} from './run';

program.version('0.0.1');

program
  .command('run', { isDefault: true })
  .argument('[path]')
  .description('runs cubismo server')
  .option('-c --config <path>', 'Specifies a path to a config file server have to take options from')
  .option('-h --host <host>', 'Specifies a host server have to serve on')
  .option('-p --port <port>', 'Specifies a port number server have to listen to')
  .option('-a --app <id>', 'Specifies an application ID to run on server start')
  .action(async (path, options, command) => {
    options.config = options.config || path || '.';
    try {
      await run(options);
    } catch (error) {
      console.error(error.message);
    }
  })

  program.command('list')
  .description('lists all running cubismo instancies')
  .action(async () => {
    try {
      await listInstancies();
    } catch (error) {
      console.error(error.message);
    }
  });

try {
  program.parse();
} catch (error) {
  console.error(error.message);
}