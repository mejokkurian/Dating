import { CONNECT_NOW_ERRORS, getErrorMessage } from '../errorMessages';

describe('errorMessages', () => {
  describe('CONNECT_NOW_ERRORS', () => {
    it('should have all required error message constants', () => {
      expect(CONNECT_NOW_ERRORS.NETWORK_ERROR).toBeDefined();
      expect(CONNECT_NOW_ERRORS.TOGGLE_ENABLE_FAILED).toBeDefined();
      expect(CONNECT_NOW_ERRORS.TOGGLE_DISABLE_FAILED).toBeDefined();
      expect(CONNECT_NOW_ERRORS.PRIVACY_SAVE_FAILED).toBeDefined();
      expect(CONNECT_NOW_ERRORS.QUICK_HELLO_SEND_FAILED).toBeDefined();
      expect(CONNECT_NOW_ERRORS.MATCH_ACCEPT_FAILED).toBeDefined();
      expect(CONNECT_NOW_ERRORS.MATCH_DECLINE_FAILED).toBeDefined();
      expect(CONNECT_NOW_ERRORS.LOCATION_UPDATE_FAILED).toBeDefined();
      expect(CONNECT_NOW_ERRORS.NEARBY_USERS_LOAD_FAILED).toBeDefined();
      expect(CONNECT_NOW_ERRORS.GENERIC_ERROR).toBeDefined();
    });

    it('should have rate limit function that formats correctly', () => {
      const message1 = CONNECT_NOW_ERRORS.QUICK_HELLO_RATE_LIMIT(1);
      expect(message1).toContain('1 second');
      
      const message2 = CONNECT_NOW_ERRORS.QUICK_HELLO_RATE_LIMIT(30);
      expect(message2).toContain('30 seconds');
    });
  });

  describe('getErrorMessage', () => {
    it('should return fallback for null/undefined error', () => {
      const result = getErrorMessage(null, 'Default message');
      expect(result).toBe('Default message');
    });

    it('should handle network errors', () => {
      const networkError = { code: 'ECONNREFUSED' };
      const result = getErrorMessage(networkError, 'Fallback');
      expect(result).toBe(CONNECT_NOW_ERRORS.NETWORK_ERROR);
    });

    it('should handle HTTP 400 errors', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid request' },
        },
      };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toBe('Invalid request');
    });

    it('should handle HTTP 401 errors', () => {
      const error = { response: { status: 401 } };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toContain('session has expired');
    });

    it('should handle HTTP 403 errors', () => {
      const error = { response: { status: 403 } };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toContain("don't have permission");
    });

    it('should handle HTTP 404 errors', () => {
      const error = { response: { status: 404 } };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toContain('not found');
    });

    it('should handle HTTP 429 errors (rate limit)', () => {
      const error = { response: { status: 429 } };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toContain('Too many requests');
    });

    it('should handle HTTP 500 errors', () => {
      const error = { response: { status: 500 } };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toContain('Server error');
    });

    it('should handle HTTP 502/503/504 errors', () => {
      const error502 = { response: { status: 502 } };
      const error503 = { response: { status: 503 } };
      const error504 = { response: { status: 504 } };
      
      expect(getErrorMessage(error502, 'Fallback')).toContain('Server error');
      expect(getErrorMessage(error503, 'Fallback')).toContain('Server error');
      expect(getErrorMessage(error504, 'Fallback')).toBe(CONNECT_NOW_ERRORS.NETWORK_ERROR);
    });

    it('should use error message if user-friendly', () => {
      const error = { message: 'User-friendly error message' };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toBe('User-friendly error message');
    });

    it('should use fallback for technical error messages', () => {
      const error = { message: 'Error: Something went wrong at line 123' };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toBe('Fallback');
    });

    it('should use fallback for long error messages', () => {
      const longMessage = 'a'.repeat(150);
      const error = { message: longMessage };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toBe('Fallback');
    });

    it('should handle errors with response.data.message', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Custom backend message' },
        },
      };
      const result = getErrorMessage(error, 'Fallback');
      expect(result).toBe('Custom backend message');
    });
  });
});
