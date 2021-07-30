import * as TSLogger from "tslog";

const tslog: TSLogger.Logger = new TSLogger.Logger();

enum MessageType {
    WARN  = " WARN",
    INFO  = " INFO",
    ERROR = "ERROR",
    FATAL = "FATAL",
    DEBUG = "DEBUG"
}

enum MessageFormat {
    Reset      = "\x1b[0m",
    Bright     = "\x1b[1m",
    Dim        = "\x1b[2m",
    Underscore = "\x1b[4m",
    Blink      = "\x1b[5m",
    Reverse    = "\x1b[7m",
    Hidden     = "\x1b[8m",
    
    FgBlack   = "\x1b[30m",
    FgRed     = "\x1b[31m",
    FgGreen   = "\x1b[32m",
    FgYellow  = "\x1b[33m",
    FgBlue    = "\x1b[34m",
    FgMagenta = "\x1b[35m",
    FgCyan    = "\x1b[36m",
    FgWhite   = "\x1b[37m",
    
    BgBlack   = "\x1b[40m",
    BgRed     = "\x1b[41m",
    BgGreen   = "\x1b[42m",
    BgYellow  = "\x1b[43m",
    BgBlue    = "\x1b[44m",
    BgMagenta = "\x1b[45m",
    BgCyan    = "\x1b[46m",
    BgWhite   = "\x1b[47m"
}

function log(type: MessageType, format: string, message: string, error?: any): void {

    const log = [];
    const timestamp = new Date().toLocaleString();
    log.push("[" + timestamp);
    log.push(type + "]");
    log.push(message);
    if(error) {
        const stack = error.stack || error;
        log.push("\n> " + stack);
    };
    console.log(format + log.join(" ") + MessageFormat.Reset);
}

/**
 * Provides an API for logging labeled messages to console
 * @global
 */
 export default class Logger {
    /**
     * Prints a message to console with label "WARN"
     * 
     * @param {string} message - a text to be displaied
     * @static
     */
    static warn (message: string): void {
        log(MessageType.WARN, MessageFormat.FgMagenta + MessageFormat.Bright, message);
    }

    /**
     * Prints a message to console with label "INFO"
     * 
     * @param {string} message - a text to be displayed
     * @static
     */
    static info(message: string): void {
        log(MessageType.INFO, MessageFormat.FgWhite, message);
    }

    /**
     * Prints a message to console with label "DEBUG"
     * 
     * @param {string} message - a text to be displayed
     * @static
     */
    static debug(message: string): void {
        // TODO: to implement displaying message only if flag DEBUF is provided
        log(MessageType.DEBUG, MessageFormat.FgYellow, message);
    }

    /**Prints a message to console with label "ERROR"
     * 
     * @param {string} message - a text to be displayed
     * @param {Error | object} [error] - an instance of Error, or an object representing an error. If it is provided
     * an error information will be additionaly displaied
     * @static
     */
    static error(message: string, error?: Error): void {
      
      tslog.prettyError(error)
      return

        log(MessageType.ERROR, MessageFormat.FgRed + MessageFormat.Bright, message, error);
    }

    /**Prints a message to console with label "FATAL"
     * 
     * @param {string} message - a text to be displayed
     * @param {Error | object} [error] - an instance of Error, or an object representing an error. If it is provided
     * an error information will be additionaly displaied
     * @static
     */
    static fatal(message: string, error?: Error | object): void {
        log(MessageType.FATAL, MessageFormat.FgRed + MessageFormat.Bright + MessageFormat.BgYellow, message, error);
    }
}

global["Logger"]  = Logger;