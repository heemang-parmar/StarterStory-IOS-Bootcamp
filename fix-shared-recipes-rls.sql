-- Fix Shared Recipes RLS and Add Chat/Notifications Tables
-- Run this in Supabase SQL Editor

-- First, fix RLS for shared_recipes
ALTER TABLE shared_recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view recipes shared with them" ON shared_recipes;
DROP POLICY IF EXISTS "Users can share their own recipes" ON shared_recipes;

-- Create proper policies for shared_recipes
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

-- Grant permissions
GRANT ALL ON shared_recipes TO authenticated;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('recipe_shared', 'message', 'reaction')),
    related_id UUID, -- ID of the related shared_recipe, message, or reaction
    title TEXT NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create partner_messages table for chat
CREATE TABLE IF NOT EXISTS partner_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE, -- Optional: for sharing recipes in chat
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_messages ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for partner_messages
CREATE POLICY "Users can view their messages" ON partner_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = recipient_id
    );

CREATE POLICY "Users can send messages" ON partner_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE (user1_id = auth.uid() AND user2_id = recipient_id)
               OR (user2_id = auth.uid() AND user1_id = recipient_id)
        )
    );

CREATE POLICY "Users can update their sent messages" ON partner_messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS partner_messages_partnership_idx ON partner_messages(partnership_id);
CREATE INDEX IF NOT EXISTS partner_messages_created_at_idx ON partner_messages(created_at DESC);

-- Create a function to create notification when recipe is shared
CREATE OR REPLACE FUNCTION notify_recipe_shared()
RETURNS TRIGGER AS $$
DECLARE
    sharer_name TEXT;
    recipe_title TEXT;
BEGIN
    -- Get sharer's name
    SELECT display_name INTO sharer_name
    FROM user_profiles
    WHERE user_id = NEW.shared_by;
    
    -- Get recipe title
    SELECT title INTO recipe_title
    FROM recipes
    WHERE id = NEW.recipe_id;
    
    -- Create notification for recipient
    INSERT INTO notifications (user_id, type, related_id, title, body)
    VALUES (
        NEW.shared_with,
        'recipe_shared',
        NEW.id,
        'New Recipe Shared!',
        sharer_name || ' shared "' || recipe_title || '" with you'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for notifications
DROP TRIGGER IF EXISTS on_recipe_shared ON shared_recipes;
CREATE TRIGGER on_recipe_shared
    AFTER INSERT ON shared_recipes
    FOR EACH ROW
    EXECUTE FUNCTION notify_recipe_shared();

-- Grant necessary permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON partner_messages TO authenticated;