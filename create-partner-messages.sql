-- Create partner_messages table if it doesn't exist
-- Run this in Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS partner_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS partner_messages_sender_idx ON partner_messages(sender_id);
CREATE INDEX IF NOT EXISTS partner_messages_recipient_idx ON partner_messages(recipient_id);
CREATE INDEX IF NOT EXISTS partner_messages_created_at_idx ON partner_messages(created_at DESC);

-- Enable RLS
ALTER TABLE partner_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their messages" ON partner_messages;
DROP POLICY IF EXISTS "Users can send messages" ON partner_messages;
DROP POLICY IF EXISTS "Users can update their messages" ON partner_messages;

-- Create policies
CREATE POLICY "Users can view their messages" ON partner_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = recipient_id
    );

CREATE POLICY "Users can send messages" ON partner_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY "Users can update messages they received" ON partner_messages
    FOR UPDATE USING (
        auth.uid() = recipient_id
    );

-- Grant permissions
GRANT ALL ON partner_messages TO authenticated;

-- Test query to verify table exists
SELECT COUNT(*) FROM partner_messages;