// Debug Helper for Matchmaking System
// Add this to MainScreen.js temporarily to debug

// Add after the state declarations:
console.log('=== MATCHMAKING DEBUG ===');
console.log('Current Index:', currentIndex);
console.log('Total Profiles:', profiles.length);
console.log('Current Profile:', currentProfile);
console.log('========================');

// Test the swipe handlers:
const testSwipeLeft = () => {
  console.log('TEST: Swipe Left called');
  handleSwipeLeft(currentProfile);
};

const testSwipeRight = () => {
  console.log('TEST: Swipe Right called');
  handleSwipeRight(currentProfile);
};

// Add test buttons to your UI temporarily:
<View style={{ position: 'absolute', top: 100, left: 20, zIndex: 1000 }}>
  <TouchableOpacity 
    onPress={testSwipeLeft}
    style={{ backgroundColor: 'red', padding: 10, marginBottom: 10 }}
  >
    <Text style={{ color: 'white' }}>TEST SWIPE LEFT</Text>
  </TouchableOpacity>
  <TouchableOpacity 
    onPress={testSwipeRight}
    style={{ backgroundColor: 'green', padding: 10 }}
  >
    <Text style={{ color: 'white' }}>TEST SWIPE RIGHT</Text>
  </TouchableOpacity>
</View>
