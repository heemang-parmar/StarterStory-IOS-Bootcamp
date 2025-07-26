-- Fix partner_messages table to handle partnership_id properly
-- Run this in Supabase SQL Editor

-- First, get the partnership for each message based on sender and recipient
ALTER TABLE partner_messages DROP COLUMN IF EXISTS partnership_id;

-- Simplified partner_messages without partnership_id constraint
ALTER TABLE partner_messages 
  ADD COLUMN IF NOT EXISTS partnership_id UUID;

-- Update the insert policy to validate partnership exists
DROP POLICY IF EXISTS "Users can send messages" ON partner_messages;
CREATE POLICY "Users can send messages" ON partner_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE (user1_id = auth.uid() AND user2_id = recipient_id)
               OR (user2_id = auth.uid() AND user1_id = recipient_id)
        )
    );

-- Create a function to automatically set partnership_id
CREATE OR REPLACE FUNCTION set_partnership_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT id INTO NEW.partnership_id
    FROM partnerships
    WHERE (user1_id = NEW.sender_id AND user2_id = NEW.recipient_id)
       OR (user2_id = NEW.sender_id AND user1_id = NEW.recipient_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set partnership_id
DROP TRIGGER IF EXISTS set_partnership_id_trigger ON partner_messages;
CREATE TRIGGER set_partnership_id_trigger
    BEFORE INSERT ON partner_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_partnership_id();