const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
    log(...args: any[]) {
        if (!isProduction) {
            console.log(...args);
        }
    },
    error(message: string, error?: any) {
        if (isProduction) {
            // In production, log a sanitized message to prevent leaking stack traces or internal database fields
            console.error(`[API Error] ${message}`);
        } else {
            // In development, log full details
            console.error(`[API Error] ${message}`, error !== undefined ? error : '');
        }
    },
    warn(...args: any[]) {
        if (!isProduction) {
            console.warn(...args);
        }
    }
};

export default logger;
