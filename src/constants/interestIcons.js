/**
 * Interest Icons Mapping
 * Maps each interest to an icon from FontAwesome5 or Ionicons
 */

export const INTEREST_ICONS = {
  // Original compound interests
  "Fine Dining": { name: "utensils", library: "FontAwesome5" },
  "Luxury Travel": { name: "plane", library: "FontAwesome5" },
  "Art & Culture": { name: "brush", library: "Ionicons" },
  "Fitness": { name: "dumbbell", library: "FontAwesome5" },
  "Nightlife": { name: "moon", library: "Ionicons" },
  "Business": { name: "briefcase", library: "FontAwesome5" },
  "Fashion": { name: "shirt", library: "Ionicons" },
  "Music": { name: "musical-notes", library: "Ionicons" },
  "Wine & Spirits": { name: "wine-glass-alt", library: "FontAwesome5" },
  "Golf": { name: "golf-ball", library: "FontAwesome5" },
  "Yachting": { name: "anchor", library: "FontAwesome5" },
  "Spa & Wellness": { name: "spa", library: "FontAwesome5" },
  "Photography": { name: "camera", library: "Ionicons" },
  "Cooking": { name: "restaurant", library: "Ionicons" },
  "Tech": { name: "laptop", library: "FontAwesome5" },
  "Outdoors": { name: "leaf", library: "Ionicons" },
  
  // Common single-word variations
  "Travel": { name: "plane", library: "FontAwesome5" },
  "Food": { name: "utensils", library: "FontAwesome5" },
  "Wine": { name: "wine-glass-alt", library: "FontAwesome5" },
  "Culture": { name: "brush", library: "Ionicons" },
  "Art": { name: "brush", library: "Ionicons" },
  "Nature": { name: "leaf", library: "Ionicons" },
  "Wellness": { name: "spa", library: "FontAwesome5" },
  "Sports": { name: "basketball", library: "Ionicons" },
  "Reading": { name: "book", library: "Ionicons" },
  "Movies": { name: "film", library: "Ionicons" },
  "Gaming": { name: "game-controller", library: "Ionicons" },
  "Hiking": { name: "leaf", library: "Ionicons" },
  "Yoga": { name: "body", library: "Ionicons" },
  "Dancing": { name: "musical-notes", library: "Ionicons" },
  "Coffee": { name: "cafe", library: "Ionicons" },
  "Pets": { name: "paw", library: "FontAwesome5" },
  "Cars": { name: "car", library: "Ionicons" }
};

// Default icon for unmapped interests
export const DEFAULT_INTEREST_ICON = { name: "star", library: "Ionicons" };

/**
 * Get icon for an interest with fallback handling
 * Handles HTML entities like &amp; and case variations
 */
export const getInterestIcon = (interest) => {
  // Try direct lookup first
  if (INTEREST_ICONS[interest]) {
    return INTEREST_ICONS[interest];
  }
  
  // Try with decoded HTML entities
  const decoded = interest.replace(/&amp;/g, '&');
  if (INTEREST_ICONS[decoded]) {
    return INTEREST_ICONS[decoded];
  }
  
  // Try case-insensitive match
  const lowerInterest = interest.toLowerCase();
  const matchedKey = Object.keys(INTEREST_ICONS).find(
    key => key.toLowerCase() === lowerInterest || 
           key.replace(/&/g, '&amp;').toLowerCase() === lowerInterest
  );
  
  if (matchedKey) {
    return INTEREST_ICONS[matchedKey];
  }
  
  return DEFAULT_INTEREST_ICON;
};
