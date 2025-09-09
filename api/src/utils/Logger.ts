import winston from 'winston';
import ecsFormat from "@elastic/ecs-winston-format";


const Logger = winston.createLogger({
    format: ecsFormat(),
    transports: [
        new winston.transports.Console({})
    ]
})

export default Logger;