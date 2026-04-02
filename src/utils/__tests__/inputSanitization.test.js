import {
  sanitizeText,
  sanitizeMessage,
  validateMessage,
  sanitizeAndValidateMessage,
} from '../inputSanitization';

describe('inputSanitization', () => {
  describe('sanitizeText', () => {
    it('should return empty string for non-string input', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText(123)).toBe('');
      expect(sanitizeText({})).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });

    it('should remove control characters', () => {
      expect(sanitizeText('hello\x00world')).toBe('helloworld');
      expect(sanitizeText('hello\x1Fworld')).toBe('helloworld');
    });

    it('should remove script tags', () => {
      expect(sanitizeText('<script>alert("xss")</script>hello')).toBe('hello');
      expect(sanitizeText('hello<script>alert("xss")</script>')).toBe('hello');
    });

    it('should remove event handlers', () => {
      expect(sanitizeText('hello onclick="alert(1)" world')).toBe('hello world');
      expect(sanitizeText('onerror="alert(1)"')).toBe('');
    });

    it('should remove javascript: URLs', () => {
      expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeText('<div>hello</div>')).toBe('hello');
      expect(sanitizeText('<b>bold</b>')).toBe('bold');
    });

    it('should preserve newlines', () => {
      expect(sanitizeText('hello\nworld')).toBe('hello\nworld');
    });

    it('should limit consecutive newlines', () => {
      expect(sanitizeText('hello\n\n\n\n\nworld')).toBe('hello\n\n\nworld');
    });
  });

  describe('sanitizeMessage', () => {
    it('should sanitize basic text', () => {
      expect(sanitizeMessage('Hello world!')).toBe('Hello world!');
    });

    it('should preserve emojis', () => {
      expect(sanitizeMessage('Hello 👋 world!')).toBe('Hello 👋 world!');
      expect(sanitizeMessage('😀😃😄')).toBe('😀😃😄');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeMessage('hello<script>alert(1)</script>world')).toBe('helloworld');
      expect(sanitizeMessage('hello; DROP TABLE users;')).toContain('hello');
      expect(sanitizeMessage('hello; DROP TABLE users;')).not.toContain('DROP');
    });

    it('should remove angle brackets', () => {
      expect(sanitizeMessage('hello <world>')).toBe('hello world');
      expect(sanitizeMessage('hello {world}')).toBe('hello world');
    });

    it('should handle empty strings', () => {
      expect(sanitizeMessage('')).toBe('');
      expect(sanitizeMessage('   ')).toBe('');
    });

    it('should preserve normal punctuation', () => {
      expect(sanitizeMessage("Hello, world! Don't worry.")).toContain("Don't");
      expect(sanitizeMessage('Hello, world!')).toBe('Hello, world!');
    });
  });

  describe('validateMessage', () => {
    it('should validate empty message', () => {
      const result = validateMessage('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should validate message length', () => {
      const longMessage = 'a'.repeat(201);
      const result = validateMessage(longMessage, 200);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('200');
    });

    it('should validate whitespace-only message', () => {
      const result = validateMessage('   \n\t   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('whitespace');
    });

    it('should accept valid message', () => {
      const result = validateMessage('Hello world!');
      expect(result.valid).toBe(true);
    });

    it('should accept message at max length', () => {
      const message = 'a'.repeat(200);
      const result = validateMessage(message, 200);
      expect(result.valid).toBe(true);
    });
  });

  describe('sanitizeAndValidateMessage', () => {
    it('should sanitize and validate valid message', () => {
      const result = sanitizeAndValidateMessage('Hello world!', 200);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello world!');
    });

    it('should sanitize dangerous content', () => {
      const result = sanitizeAndValidateMessage('<script>alert(1)</script>Hello', 200);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should reject invalid message', () => {
      const result = sanitizeAndValidateMessage('', 200);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject message that is too long after sanitization', () => {
      const longMessage = 'a'.repeat(201);
      const result = sanitizeAndValidateMessage(longMessage, 200);
      expect(result.valid).toBe(false);
    });
  });
});
