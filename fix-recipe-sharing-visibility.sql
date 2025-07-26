-- Fix recipe sharing visibility issue
-- Run this in Supabase SQL Editor

-- First, check if recipes table has RLS enabled
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON recipes;

-- Create new policies that allow viewing shared recipes
CREATE POLICY "Users can view their own recipes" ON recipes
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can view recipes shared with them" ON recipes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shared_recipes
            WHERE shared_recipes.recipe_id = recipes.id
            AND shared_recipes.shared_with = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own recipes" ON recipes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own recipes" ON recipes
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete their own recipes" ON recipes
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Grant permissions
GRANT ALL ON recipes TO authenticated;

-- Also ensure shared_recipes RLS is correct
ALTER TABLE shared_recipes ENABLE ROW LEVEL SECURITY;

-- Recreate shared_recipes policies
DROP POLICY IF EXISTS "Users can view shared recipes" ON shared_recipes;
DROP POLICY IF EXISTS "Users can insert shared recipes" ON shared_recipes;
DROP POLICY IF EXISTS "Users can delete their shared recipes" ON shared_recipes;

CREATE POLICY "Users can view shared recipes" ON shared_recipes
    FOR SELECT USING (
        auth.uid() = shared_by OR 
        auth.uid() = shared_with
    );

CREATE POLICY "Users can insert shared recipes" ON shared_recipes
    FOR INSERT WITH CHECK (
        auth.uid() = shared_by
    );

CREATE POLICY "Users can delete their shared recipes" ON shared_recipes
    FOR DELETE USING (
        auth.uid() = shared_by
    );

-- Test query to verify the fix
-- This should return shared recipes for the current user
SELECT 
    sr.id as shared_recipe_id,
    sr.shared_at,
    sr.message,
    r.id as recipe_id,
    r.title,
    r.summary
FROM shared_recipes sr
JOIN recipes r ON sr.recipe_id = r.id
WHERE sr.shared_with = auth.uid()
ORDER BY sr.shared_at DESC
LIMIT 5;