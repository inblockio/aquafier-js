import {context, trace} from '@opentelemetry/api';

export function getTracer() {
    return trace.getTracer("aquafier");
}

export function getCurrentActiveSpan() {
    return trace.getSpan(context.active());
}