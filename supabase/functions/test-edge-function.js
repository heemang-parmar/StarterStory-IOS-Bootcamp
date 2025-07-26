// Test script for the openai-completion edge function
// Usage: node test-edge-function.js

const SUPABASE_URL = 'https://ihbpcgpixmioqnfbjoqz.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // Replace with your anon key
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // Replace with a valid user access token

// Test 1: Text-only request
async function testTextOnly() {
  console.log('\n📝 Testing text-only request...');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/openai-completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      prompt: 'I have chicken, rice, and broccoli. What can I make?'
    })
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Detected ingredients:', data.detectedIngredients);
  console.log('Number of recipes:', data.personalizedRecipes?.length || 0);
}

// Test 2: Image URL request
async function testImageUrl() {
  console.log('\n📷 Testing image URL request...');
  
  // Replace with an actual image URL from your ingredient-images bucket
  const testImageUrl = `${SUPABASE_URL}/storage/v1/object/public/ingredient-images/test-image.jpg`;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/openai-completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      prompt: 'What healthy meals can I make?',
      imageUrl: testImageUrl
    })
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Detected ingredients:', data.detectedIngredients);
  console.log('Number of recipes:', data.personalizedRecipes?.length || 0);
}

// Test 3: Image-only request
async function testImageOnly() {
  console.log('\n🖼️ Testing image-only request...');
  
  // Replace with an actual image URL from your ingredient-images bucket
  const testImageUrl = `${SUPABASE_URL}/storage/v1/object/public/ingredient-images/test-image.jpg`;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/openai-completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      imageUrl: testImageUrl
    })
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Detected ingredients:', data.detectedIngredients);
  console.log('Number of recipes:', data.personalizedRecipes?.length || 0);
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting edge function tests...');
  console.log('================================');
  
  try {
    await testTextOnly();
    await testImageUrl();
    await testImageOnly();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Instructions
console.log('⚠️  Before running tests:');
console.log('1. Replace SUPABASE_ANON_KEY with your project\'s anon key');
console.log('2. Replace ACCESS_TOKEN with a valid user access token');
console.log('3. Upload a test image to the ingredient-images bucket');
console.log('4. Update testImageUrl with the actual image URL\n');

// Uncomment to run tests
// runTests();