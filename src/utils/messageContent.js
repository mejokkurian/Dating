// Helper function to normalize message content to string
// Prevents "[object Object]" display issues - SAFE VERSION (no recursion)
export const normalizeContent = (content, depth = 0, visited = new WeakSet()) => {
  // Prevent infinite recursion
  if (depth > 3) {
    return '';
  }
  
  if (content === null || content === undefined) {
    return '';
  }
  
  if (typeof content === 'string') {
    return content;
  }
  
  if (typeof content === 'object') {
    // Prevent circular references
    if (visited.has(content)) {
      return '';
    }
    visited.add(content);
    
    try {
      // If it's a Mongoose document, try toObject
      if (typeof content.toObject === 'function') {
        try {
          const obj = content.toObject();
          if (obj && typeof obj === 'object') {
            if (obj.content && typeof obj.content === 'string') return obj.content;
            if (obj.text && typeof obj.text === 'string') return obj.text;
            if (obj.message && typeof obj.message === 'string') return obj.message;
            // Recursively check nested object
            if (depth < 3) {
              const nested = normalizeContent(obj, depth + 1, new WeakSet());
              if (nested) return nested;
            }
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Check if this looks like a full message object
      if (content._id && content.senderId && content.content !== undefined) {
        const nested = content.content;
        if (typeof nested === 'string') return nested;
        if (nested !== null && nested !== undefined && depth < 3) {
          const result = normalizeContent(nested, depth + 1, new WeakSet());
          if (result) return result;
        }
      }
      
      // If it's an array
      if (Array.isArray(content)) {
        return content.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && depth < 3) {
            return normalizeContent(item, depth + 1, new WeakSet());
          }
          return String(item);
        }).filter(s => s && s.length > 0).join(' ');
      }
      
      // Try common properties (content, text, message) - with recursion for nested objects
      if (content.content !== undefined && content.content !== null) {
        const cont = content.content;
        if (typeof cont === 'string' && cont.length > 0) return cont;
        if (typeof cont === 'object' && depth < 3) {
          const result = normalizeContent(cont, depth + 1, new WeakSet());
          if (result) return result;
        }
      }
      
      if (content.text !== undefined && content.text !== null) {
        if (typeof content.text === 'string' && content.text.length > 0) {
          return content.text;
        }
        if (typeof content.text === 'object' && depth < 3) {
          const result = normalizeContent(content.text, depth + 1, new WeakSet());
          if (result) return result;
        }
      }
      
      if (content.message !== undefined && content.message !== null) {
        if (typeof content.message === 'string' && content.message.length > 0) {
          return content.message;
        }
        if (typeof content.message === 'object' && depth < 3) {
          const result = normalizeContent(content.message, depth + 1, new WeakSet());
          if (result) return result;
        }
      }
      
      // Try to find any string property (limit to 15 to prevent crashes)
      const keys = Object.keys(content);
      for (let i = 0; i < Math.min(keys.length, 15); i++) {
        try {
          const key = keys[i];
          // Skip internal/private properties
          if (key.startsWith('_') && key !== '_id') continue;
          
          const value = content[key];
          if (typeof value === 'string' && value.length > 0) {
            return value;
          }
          // Recursively check nested objects
          if (typeof value === 'object' && value !== null && depth < 3) {
            const result = normalizeContent(value, depth + 1, new WeakSet());
            if (result) return result;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      // Silent fail to prevent crashes
    } finally {
      visited.delete(content);
    }
    
    // Last resort: return empty string instead of "[object Object]"
    return '';
  }
  
  try {
    const str = String(content);
    // If String() returns "[object Object]", return empty string
    if (str === '[object Object]' || str === '[object Object]') {
      return '';
    }
    return str;
  } catch {
    return '';
  }
};

