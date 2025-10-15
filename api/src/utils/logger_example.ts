// usage-examples.ts
import Logger, { EventCategory, EventType, EventOutcome } from './logger';

// Example 1: User Authentication
async function handleLogin(email: string, password: string) {
  const startTime = Date.now();
  
  try {
    // Your authentication logic here
    // const user = await yourAuthService.authenticate(email, password);
    const user = { id: '123', email, name: 'John Doe' };
    
    const duration = Date.now() - startTime;
    Logger.logAuthEvent('user-login', EventOutcome.SUCCESS, user.id);
    
    // Or using the detailed method:
    Logger.logEvent('User logged in successfully', {
      category: EventCategory.AUTHENTICATION,
      type: EventType.ACCESS,
      action: 'user-login',
      outcome: EventOutcome.SUCCESS,
      duration,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      metadata: {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      }
    });
    
    return user;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    Logger.logAuthEvent('user-login', EventOutcome.FAILURE, undefined, error.message);
    throw error;
  }
}

// Example 2: API Request Tracking
async function handleApiRequest(req: any, res: any, next: any) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const outcome = res.statusCode >= 400 ? EventOutcome.FAILURE : EventOutcome.SUCCESS;
    
    Logger.logApiEvent(`${req.method} ${req.path}`, duration, outcome);
  });
  
  next();
}

// Example 3: Database Operations
async function createUser(userData: any) {
  const startTime = Date.now();
  
  try {
    // Your database logic here
    // const user = await yourDb.users.create(userData);
    const user = { id: '456', ...userData };
    const duration = Date.now() - startTime;
    
    Logger.logEvent('User created in database', {
      category: EventCategory.DATABASE,
      type: EventType.CREATION,
      action: 'user-create',
      outcome: EventOutcome.SUCCESS,
      duration,
      metadata: {
        userId: user.id,
        table: 'users',
      }
    });
    
    return user;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    Logger.logDatabaseEvent('user-create', duration, EventOutcome.FAILURE);
    throw error;
  }
}

// Example 4: Complex Business Event
async function processPayment(orderId: string, amount: number, userId: string) {
  const startTime = Date.now();
  
  try {
    // Your payment processing logic here
    // const result = await yourPaymentGateway.charge(amount);
    const result = { transactionId: 'txn_123' };
    const duration = Date.now() - startTime;
    
    Logger.logEvent('Payment processed successfully', {
      category: [EventCategory.API, EventCategory.WEB],
      type: [EventType.ACCESS, EventType.CHANGE],
      action: 'payment-process',
      outcome: EventOutcome.SUCCESS,
      duration,
      user: { id: userId },
      metadata: {
        orderId,
        amount,
        currency: 'USD',
        paymentMethod: 'credit_card',
        transactionId: result.transactionId,
      }
    });
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    Logger.logEvent('Payment processing failed', {
      category: EventCategory.API,
      type: EventType.ERROR,
      action: 'payment-process',
      outcome: EventOutcome.FAILURE,
      duration,
      reason: error.message,
      user: { id: userId },
      metadata: {
        orderId,
        amount,
        errorCode: error.code,
      }
    });
    
    throw error;
  }
}

// Example 5: File Operations
async function uploadFile(file: any, userId: string) {
  Logger.logEvent('File upload started', {
    category: EventCategory.FILE,
    type: EventType.CREATION,
    action: 'file-upload-start',
    outcome: EventOutcome.SUCCESS,
    user: { id: userId },
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }
  });
  
  try {
    // Your storage service logic here
    // const result = await yourStorageService.upload(file);
    const result = { id: 'file-123', url: 'https://...' };
    
    Logger.logEvent('File upload completed', {
      category: EventCategory.FILE,
      type: EventType.CREATION,
      action: 'file-upload-complete',
      outcome: EventOutcome.SUCCESS,
      user: { id: userId },
      metadata: {
        fileName: file.name,
        fileId: result.id,
        url: result.url,
      }
    });
    
    return result;
  } catch (error: any) {
    Logger.logEvent('File upload failed', {
      category: EventCategory.FILE,
      type: EventType.ERROR,
      action: 'file-upload-failed',
      outcome: EventOutcome.FAILURE,
      reason: error.message,
      user: { id: userId },
    });
    throw error;
  }
}

// Example 6: Using Child Logger for Request Context
function createRequestLogger(requestId: string, userId?: string) {
  return Logger.child({
    requestId,
    userId,
  });
}

async function handleUserRequest(req: any) {
  const requestLogger = createRequestLogger(req.id, req.user?.id);
  
  requestLogger.logEvent('Processing user request', {
    category: EventCategory.WEB,
    type: EventType.ACCESS,
    action: 'request-start',
  });
  
  // All logs from this point will include requestId and userId
  requestLogger.info('Fetching user data');
  // ... more operations
}