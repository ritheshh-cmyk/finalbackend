declare const logger: {
    level: string;
    createLogger: () => any;
    format: {
        combine: () => void;
        timestamp: () => void;
        json: () => void;
    };
    transports: {
        Console: {
            new (): {};
        };
        File: {
            new (): {};
        };
    };
    info: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map