-- Fix Partner RLS Policies - Final Version
-- This will maintain security while allowing proper access

-- Re-enable RLS (IMPORTANT for security!)
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all their requests" ON partner_requests;
DROP POLICY IF EXISTS "Users can create partner requests" ON partner_requests;
DROP POLICY IF EXISTS "Users can update their requests" ON partner_requests;

-- Create new, working policies
-- Policy 1: Users can view requests where they are sender OR recipient
CREATE POLICY "Enable read access for involved users" ON partner_requests
    FOR SELECT USING (
        auth.uid() = sender_id 
        OR 
        auth.email() = recipient_email
        OR
        recipient_email IN (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Policy 2: Users can insert their own requests
CREATE POLICY "Enable insert for authenticated users" ON partner_requests
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

-- Policy 3: Users can update requests they received
CREATE POLICY "Enable update for recipients" ON partner_requests
    FOR UPDATE USING (
        auth.email() = recipient_email
        OR
        recipient_email IN (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Policy 4: Users can delete their own sent requests
CREATE POLICY "Enable delete for senders" ON partner_requests
    FOR DELETE USING (
        auth.uid() = sender_id
    );

-- Grant necessary permissions
GRANT ALL ON partner_requests TO authenticated;
GRANT ALL ON partnerships TO authenticated;
GRANT EXECUTE ON FUNCTION accept_partner_request(UUID) TO authenticated;

-- Test the policies with your actual data
-- This should return results with RLS enabled
SELECT 
    pr.*,
    au.email as sender_email
FROM partner_requests pr
LEFT JOIN auth.users au ON pr.sender_id = au.id
WHERE pr.status = 'pending';