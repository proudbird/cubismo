// import { Logger } from "tslog";

// const log: Logger = new Logger();

process.on('uncaughtException', function (err: Error) {
  // log.prettyError(err);
  console.log(err);
});

process.on('unhandledRejection', function (err: Error) {
  // log.prettyError(err);
  console.log(err);
});