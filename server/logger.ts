// Simple console-based logger replacement to avoid winston dependency issues
const logger = {
  level: 'info',
  createLogger: () => logger,
  format: {
    combine: () => {},
    timestamp: () => {},
    json: () => {}
  },
  transports: {
    Console: class {},
    File: class {}
  },
  info: (message: string, ...args: any[]) => console.log(`[${new Date().toISOString()}] [INFO]`, message, ...args),
  error: (message: string, ...args: any[]) => console.error(`[${new Date().toISOString()}] [ERROR]`, message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[${new Date().toISOString()}] [WARN]`, message, ...args),
  debug: (message: string, ...args: any[]) => console.log(`[${new Date().toISOString()}] [DEBUG]`, message, ...args)
};

export default logger; 