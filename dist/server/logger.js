"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = {
    level: 'info',
    createLogger: () => logger,
    format: {
        combine: () => { },
        timestamp: () => { },
        json: () => { }
    },
    transports: {
        Console: class {
        },
        File: class {
        }
    },
    info: (message, ...args) => console.log(`[${new Date().toISOString()}] [INFO]`, message, ...args),
    error: (message, ...args) => console.error(`[${new Date().toISOString()}] [ERROR]`, message, ...args),
    warn: (message, ...args) => console.warn(`[${new Date().toISOString()}] [WARN]`, message, ...args),
    debug: (message, ...args) => console.log(`[${new Date().toISOString()}] [DEBUG]`, message, ...args)
};
exports.default = logger;
//# sourceMappingURL=logger.js.map