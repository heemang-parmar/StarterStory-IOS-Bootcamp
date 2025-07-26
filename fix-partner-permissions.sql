-- Fix Partner Request Permissions
-- Run this in Supabase SQL Editor to fix the permission error

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('partner_requests', 'partnerships', 'shared_recipes', 'recipe_reactions');

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own sent requests" ON partner_requests;
DROP POLICY IF EXISTS "Users can view requests sent to them" ON partner_requests;
DROP POLICY IF EXISTS "Users can create partner requests" ON partner_requests;
DROP POLICY IF EXISTS "Users can update requests sent to them" ON partner_requests;

-- Create simpler, more permissive policies for partner_requests
CREATE POLICY "Users can view all their requests" ON partner_requests
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can create partner requests" ON partner_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their requests" ON partner_requests
    FOR UPDATE USING (
        auth.uid() = sender_id OR 
        recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Also ensure the accept_partner_request function has proper permissions
GRANT EXECUTE ON FUNCTION accept_partner_request(UUID) TO authenticated;

-- Test query to verify access
-- Replace 'your-email@example.com' with your actual email
SELECT * FROM partner_requests 
WHERE status = 'pending' 
AND (sender_id = auth.uid() OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid()));