import {
  isValidLatitude,
  isValidLongitude,
  validateCoordinates,
  validateCoordinatesOrThrow,
} from '../locationValidation';

describe('locationValidation', () => {
  describe('isValidLatitude', () => {
    it('should return true for valid latitudes', () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(37.7749)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(45.5)).toBe(true);
    });

    it('should return false for invalid latitudes', () => {
      expect(isValidLatitude(-91)).toBe(false);
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(100)).toBe(false);
      expect(isValidLatitude(-100)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(isValidLatitude(null)).toBe(false);
      expect(isValidLatitude(undefined)).toBe(false);
      expect(isValidLatitude('37.7749')).toBe(false);
      expect(isValidLatitude(NaN)).toBe(false);
      expect(isValidLatitude({})).toBe(false);
    });
  });

  describe('isValidLongitude', () => {
    it('should return true for valid longitudes', () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(-122.4194)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(120.5)).toBe(true);
    });

    it('should return false for invalid longitudes', () => {
      expect(isValidLongitude(-181)).toBe(false);
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(200)).toBe(false);
      expect(isValidLongitude(-200)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(isValidLongitude(null)).toBe(false);
      expect(isValidLongitude(undefined)).toBe(false);
      expect(isValidLongitude('-122.4194')).toBe(false);
      expect(isValidLongitude(NaN)).toBe(false);
      expect(isValidLongitude({})).toBe(false);
    });
  });

  describe('validateCoordinates', () => {
    it('should return valid for correct coordinates', () => {
      const result = validateCoordinates(37.7749, -122.4194);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for out-of-range latitude', () => {
      const result = validateCoordinates(91, -122.4194);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid latitude');
      expect(result.error).toContain('91');
    });

    it('should return invalid for out-of-range longitude', () => {
      const result = validateCoordinates(37.7749, -181);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid longitude');
      expect(result.error).toContain('-181');
    });

    it('should return invalid for both invalid coordinates', () => {
      const result = validateCoordinates(91, -181);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid latitude');
    });

    it('should handle edge cases', () => {
      expect(validateCoordinates(-90, -180).valid).toBe(true);
      expect(validateCoordinates(90, 180).valid).toBe(true);
      expect(validateCoordinates(0, 0).valid).toBe(true);
    });
  });

  describe('validateCoordinatesOrThrow', () => {
    it('should not throw for valid coordinates', () => {
      expect(() => validateCoordinatesOrThrow(37.7749, -122.4194)).not.toThrow();
    });

    it('should throw error for invalid latitude', () => {
      expect(() => validateCoordinatesOrThrow(91, -122.4194)).toThrow('Invalid latitude');
    });

    it('should throw error for invalid longitude', () => {
      expect(() => validateCoordinatesOrThrow(37.7749, -181)).toThrow('Invalid longitude');
    });

    it('should throw error with descriptive message', () => {
      try {
        validateCoordinatesOrThrow(91, -122.4194);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Invalid latitude');
        expect(error.message).toContain('91');
        expect(error.message).toContain('-90');
        expect(error.message).toContain('90');
      }
    });
  });
});
