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
    } catch (error: any) {
      // OpenTelemetry not available - that's fine
    }
  }
  return info;
});

const Logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  defaultMeta: { service: process.env.SERVICE_NAME || 'api' },
  format: winston.format.combine(
    otelFormat(),
    ecsFormat({ convertReqRes: true })
  ),
  transports: [
    new winston.transports.File({
      filename: 'aquafier.log',
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Event categories following ECS conventions
export enum EventCategory {
  AUTHENTICATION = 'authentication',
  DATABASE = 'database',
  WEB = 'web',
  API = 'api',
  PROCESS = 'process',
  NETWORK = 'network',
  FILE = 'file',
  IAM = 'iam',
  CONFIGURATION = 'configuration',
}

export enum EventType {
  ACCESS = 'access',
  CHANGE = 'change',
  CREATION = 'creation',
  DELETION = 'deletion',
  INFO = 'info',
  ERROR = 'error',
  START = 'start',
  END = 'end',
}

export enum EventOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  UNKNOWN = 'unknown',
}

// Event logging interface
export interface EventLogOptions {
  category?: EventCategory | EventCategory[];
  type?: EventType | EventType[];
  action?: string;
  outcome?: EventOutcome;
  duration?: number; // in milliseconds
  reason?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  metadata?: Record<string, any>;
}

// Enhanced logger with event methods
class EnhancedLogger {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  // Standard logging methods
  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  // Event logging method
  logEvent(message: string, options: EventLogOptions = {}) {
    const eventData: any = {
      message,
      event: {
        category: options.category,
        type: options.type,
        action: options.action,
        outcome: options.outcome || EventOutcome.SUCCESS,
      },
    };

    // Add duration if provided
    if (options.duration !== undefined) {
      eventData.event.duration = options.duration * 1000000; // Convert to nanoseconds (ECS format)
    }

    // Add reason for failures
    if (options.reason) {
      eventData.event.reason = options.reason;
    }

    // Add user information
    if (options.user) {
      eventData.user = {
        id: options.user.id,
        name: options.user.name,
        email: options.user.email,
      };
    }

    // Add any additional metadata
    if (options.metadata) {
      Object.assign(eventData, options.metadata);
    }

    // Log at appropriate level based on outcome
    const level = options.outcome === EventOutcome.FAILURE ? 'error' : 'info';
    this.logger.log(level, eventData);
  }

  // Convenience methods for common events
  logAuthEvent(action: string, outcome: EventOutcome, userId?: string, reason?: string) {
    this.logEvent(`Authentication ${action}`, {
      category: EventCategory.AUTHENTICATION,
      type: outcome === EventOutcome.SUCCESS ? EventType.ACCESS : EventType.ERROR,
      action,
      outcome,
      reason,
      user: userId ? { id: userId } : undefined,
    });
  }

  logApiEvent(action: string, duration?: number, outcome: EventOutcome = EventOutcome.SUCCESS) {
    this.logEvent(`API ${action}`, {
      category: EventCategory.API,
      type: EventType.ACCESS,
      action,
      duration,
      outcome,
    });
  }

  logDatabaseEvent(action: string, duration?: number, outcome: EventOutcome = EventOutcome.SUCCESS) {
    this.logEvent(`Database ${action}`, {
      category: EventCategory.DATABASE,
      type: EventType.ACCESS,
      action,
      duration,
      outcome,
    });
  }

  // Method to create child logger with additional context
  child(metadata: Record<string, any>) {
    const childLogger = this.logger.child(metadata);
    return new EnhancedLogger(childLogger);
  }
}

// Export the enhanced logger instance as default
export default new EnhancedLogger(Logger);

// Also export the raw winston logger if needed
export { Logger as rawLogger };

// // import winston from 'winston';
// // import ecsFormat from "@elastic/ecs-winston-format";
// // import { trace } from '@opentelemetry/api';
// // import { context } from '@opentelemetry/api';

// // const otelFormat = winston.format((info) => {
// //     const activeSpan = trace.getSpan(context.active());
// //     if (activeSpan) {
// //       const spanContext = activeSpan.spanContext();
// //       info.trace_id = spanContext.traceId;
// //       info.span_id = spanContext.spanId;
// //       info.trace_flags = spanContext.traceFlags.toString();
      
// //       // Also add to ECS fields
// //       info.trace = { id: spanContext.traceId };
// //       info.span = { id: spanContext.spanId };
// //     }
// //     return info;
// //   });


// // const Logger = winston.createLogger({
// //     level: 'info',
// //     defaultMeta: {service: process.env.SERVICE_NAME || 'api'},
// //     // format: ecsFormat(),
// //     format: winston.format.combine(
// //         otelFormat(),
// //         ecsFormat({ convertReqRes: true }) // Enable request/response conversion
// //       ),
// //     transports: [
// //         new winston.transports.Console({
// //             handleExceptions: true,
// //             handleRejections: true,
// //         }),
// //     ],
// //     exitOnError: false,
// // });

// // export default Logger;
