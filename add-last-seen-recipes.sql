-- Add last_seen_recipes_at column to user_profiles
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_seen_recipes_at TIMESTAMP WITH TIME ZONE;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS user_profiles_last_seen_recipes_idx 
ON user_profiles(user_id, last_seen_recipes_at);

-- Update existing users to have current timestamp as last seen
UPDATE user_profiles 
SET last_seen_recipes_at = NOW() 
WHERE last_seen_recipes_at IS NULL;