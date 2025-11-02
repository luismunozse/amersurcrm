import { 
  AppError, 
  ValidationError, 
  DatabaseError, 
  AuthError, 
  getErrorMessage, 
  handleError 
} from '../errors';

// Mock del errorLogger
jest.mock('../errorLogger', () => ({
  errorLogger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create AppError with message', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it('should create AppError with all properties', () => {
      const context = { userId: '123' };
      const error = new AppError('Test error', 'TEST_CODE', 400, context);
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual(context);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with default values', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBeUndefined();
    });

    it('should create ValidationError with field', () => {
      const error = new ValidationError('Invalid email', 'email');
      
      expect(error.message).toBe('Invalid email');
      expect(error.field).toBe('email');
    });
  });

  describe('DatabaseError', () => {
    it('should create DatabaseError with original error', () => {
      const originalError = new Error('DB connection failed');
      const error = new DatabaseError('Database operation failed', originalError);
      
      expect(error.message).toBe('Database operation failed');
      expect(error.name).toBe('DatabaseError');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('AuthError', () => {
    it('should create AuthError', () => {
      const error = new AuthError('Unauthorized');
      
      expect(error.message).toBe('Unauthorized');
      expect(error.name).toBe('AuthError');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
    });
  });
});

describe('getErrorMessage', () => {
  it('should return message for AppError', () => {
    const error = new AppError('Custom error', 'CUSTOM_CODE');
    const message = getErrorMessage(error);
    
    expect(message).toBe('Custom error');
  });

  it('should return message for standard Error', () => {
    const error = new Error('Standard error');
    const message = getErrorMessage(error);
    
    expect(message).toBe('Standard error');
  });

  it('should return message for string error', () => {
    const message = getErrorMessage('String error');
    
    expect(message).toBe('String error');
  });

  it('should return message for object with message property', () => {
    const error = { message: 'Object error' };
    const message = getErrorMessage(error);
    
    expect(message).toBe('Object error');
  });

  it('should return JSON string for object without message', () => {
    const error = { code: 'TEST', data: 'value' };
    const message = getErrorMessage(error);
    
    expect(message).toBe(JSON.stringify(error));
  });

  it('should return default message for unknown error', () => {
    const error = null;
    const message = getErrorMessage(error);
    
    expect(message).toBe('null');
  });
});

describe('handleError', () => {
  it('should throw AppError', () => {
    const error = new Error('Test error');
    const context = { operation: 'test' };
    
    expect(() => handleError(error, context)).toThrow(AppError);
  });

  it('should throw AppError with context', () => {
    const error = new Error('Test error');
    const context = { operation: 'test' };
    
    try {
      handleError(error, context);
    } catch (thrownError) {
      expect(thrownError).toBeInstanceOf(AppError);
      if (thrownError instanceof AppError) {
        expect(thrownError.message).toBe('Test error');
        expect(thrownError.context).toEqual(context);
      }
    }
  });
});
