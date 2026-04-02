/**
 * Location validation utilities
 * Validates latitude and longitude coordinates before sending to server
 */

/**
 * Valid latitude range: -90 to 90
 */
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;

/**
 * Valid longitude range: -180 to 180
 */
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

/**
 * Validate latitude value
 * @param {number} latitude - Latitude coordinate
 * @returns {boolean} - True if valid
 */
export const isValidLatitude = (latitude) => {
  if (typeof latitude !== 'number' || isNaN(latitude)) {
    return false;
  }
  return latitude >= MIN_LATITUDE && latitude <= MAX_LATITUDE;
};

/**
 * Validate longitude value
 * @param {number} longitude - Longitude coordinate
 * @returns {boolean} - True if valid
 */
export const isValidLongitude = (longitude) => {
  if (typeof longitude !== 'number' || isNaN(longitude)) {
    return false;
  }
  return longitude >= MIN_LONGITUDE && longitude <= MAX_LONGITUDE;
};

/**
 * Validate both latitude and longitude
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export const validateCoordinates = (latitude, longitude) => {
  if (!isValidLatitude(latitude)) {
    return {
      valid: false,
      error: `Invalid latitude: ${latitude}. Must be between ${MIN_LATITUDE} and ${MAX_LATITUDE}.`,
    };
  }

  if (!isValidLongitude(longitude)) {
    return {
      valid: false,
      error: `Invalid longitude: ${longitude}. Must be between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}.`,
    };
  }

  return { valid: true };
};

/**
 * Validate coordinates and throw error if invalid
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @throws {Error} - If coordinates are invalid
 */
export const validateCoordinatesOrThrow = (latitude, longitude) => {
  const validation = validateCoordinates(latitude, longitude);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
};
