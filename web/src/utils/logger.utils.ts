// logger.js
import pino from "pino";

// Configure pino for browser (no Node.js deps)
const pinoLogger = pino({
  level: "info",
  browser: {
    asObject: true, // makes logs easier to read in devtools
  },
});

// Wrap in the same interface as your winston code
interface LoggerMeta {
    [key: string]: any;
}

interface LoggerInterface {
    info: (msg: string, meta?: LoggerMeta) => void;
    error: (msg: string, meta?: LoggerMeta) => void;
    warn: (msg: string, meta?: LoggerMeta) => void;
    debug: (msg: string, meta?: LoggerMeta) => void;
}

const Logger: LoggerInterface = {
    info: (msg: string, meta: LoggerMeta = {}) => pinoLogger.info(meta, msg),
    error: (msg: string, meta: LoggerMeta = {}) => pinoLogger.error(meta, msg),
    warn: (msg: string, meta: LoggerMeta = {}) => pinoLogger.warn(meta, msg),
    debug: (msg: string, meta: LoggerMeta = {}) => pinoLogger.debug(meta, msg),
};

export default Logger;
