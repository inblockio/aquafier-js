// import winston from 'winston';
// import ecsFormat from "@elastic/ecs-winston-format";
// import { trace } from '@opentelemetry/api';
// import { context } from '@opentelemetry/api';

// const otelFormat = winston.format((info) => {
//     const activeSpan = trace.getSpan(context.active());
//     if (activeSpan) {
//       const spanContext = activeSpan.spanContext();
//       info.trace_id = spanContext.traceId;
//       info.span_id = spanContext.spanId;
//       info.trace_flags = spanContext.traceFlags.toString();
      
//       // Also add to ECS fields
//       info.trace = { id: spanContext.traceId };
//       info.span = { id: spanContext.spanId };
//     }
//     return info;
//   });


// const Logger = winston.createLogger({
//     level: 'info',
//     defaultMeta: {service: process.env.SERVICE_NAME || 'api'},
//     // format: ecsFormat(),
//     format: winston.format.combine(
//         otelFormat(),
//         ecsFormat({ convertReqRes: true }) // Enable request/response conversion
//       ),
//     transports: [
//         new winston.transports.Console({
//             handleExceptions: true,
//             handleRejections: true,
//         }),
//     ],
//     exitOnError: false,
// });

// export default Logger;

// logger.ts
import winston from 'winston';
import ecsFormat from "@elastic/ecs-winston-format";

const otelFormat = winston.format((info) => {
  // Only try to get OTel context if it's likely available
  if (process.env.TRACING_ENABLE === 'true') {
    try {
      // Dynamic import to avoid hard dependency
      const otel = require('@opentelemetry/api');
      const activeSpan = otel.trace.getSpan(otel.context.active());
      
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        info.trace_id = spanContext.traceId;
        info.span_id = spanContext.spanId;
        info.trace = { id: spanContext.traceId };
        info.span = { id: spanContext.spanId };
      }
    } catch (error) {
      // OpenTelemetry not available - that's fine
    }
  }
  return info;
});

const Logger = winston.createLogger({
  level: 'info',
  defaultMeta: { service: process.env.SERVICE_NAME || 'api' },
  format: winston.format.combine(
    otelFormat(),
    ecsFormat({ convertReqRes: true })
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

export default Logger;