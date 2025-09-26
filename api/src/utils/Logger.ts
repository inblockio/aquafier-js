import winston from 'winston';
import ecsFormat from "@elastic/ecs-winston-format";


const Logger = winston.createLogger({
    level: 'info',
    defaultMeta: {service: process.env.SERVICE_NAME || 'api'},
    format: ecsFormat(),
    transports: [
        new winston.transports.Console({
            handleExceptions: true,
            handleRejections: true,
        }),
    ],
    exitOnError: false,
});

export default Logger;