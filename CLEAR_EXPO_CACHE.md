# How to Clear Expo Cache and Update App Name

The app name is still showing as "StarterStoryTemplate" in Expo Go because of caching. Follow these steps to fix it:

## Method 1: Clear Cache and Restart (Recommended)

1. **Stop the Expo server** (Press Ctrl+C in the terminal)

2. **Clear the cache**:
   ```bash
   npx expo start -c
   ```
   When prompted about the port, choose a different port (like 8083)

3. **In Expo Go app**:
   - Pull down to refresh the project list
   - Or shake your device and tap "Reload"

## Method 2: Force Refresh in Expo Go

1. **In the Expo Go app**:
   - Go to the Projects tab
   - Find "StarterStoryTemplate" 
   - Swipe left on it and delete it
   - Scan the QR code again or enter the URL manually

## Method 3: Clear All Expo Data

1. **On iOS**:
   - Go to Settings > General > iPhone Storage
   - Find Expo Go
   - Tap "Offload App" or "Delete App"
   - Reinstall Expo Go from App Store

2. **On Android**:
   - Go to Settings > Apps > Expo
   - Tap "Clear Cache" and "Clear Data"
   - Or uninstall and reinstall Expo Go

## Method 4: Update Metro Cache

1. **Delete metro cache**:
   ```bash
   rm -rf .expo
   rm -rf node_modules/.cache
   ```

2. **Restart Expo**:
   ```bash
   npx expo start -c
   ```

## Verify Changes

After clearing cache, you should see:
- App name: "DishDecide"
- URL scheme: "dishdecide"
- All branding updated

The changes we made to `app.json` are correct, it's just a caching issue that needs to be resolved.