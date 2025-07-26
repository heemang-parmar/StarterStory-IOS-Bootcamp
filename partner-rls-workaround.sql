-- Partner RLS Workaround for Production
-- This maintains security while working around the email matching issue

-- Option 1: Create a view that bypasses RLS for partner requests
CREATE OR REPLACE VIEW my_partner_requests AS
SELECT pr.* 
FROM partner_requests pr
WHERE pr.sender_id = auth.uid() 
   OR pr.recipient_email = auth.jwt()->>'email'
   OR pr.recipient_email IN (
       SELECT email FROM auth.users WHERE id = auth.uid()
   );

-- Grant access to the view
GRANT SELECT ON my_partner_requests TO authenticated;

-- Option 2: Create a function that returns partner requests
CREATE OR REPLACE FUNCTION get_my_partner_requests()
RETURNS SETOF partner_requests AS $$
BEGIN
    RETURN QUERY
    SELECT pr.*
    FROM partner_requests pr
    WHERE pr.status = 'pending'
      AND (
          pr.sender_id = auth.uid()
          OR pr.recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
          OR pr.recipient_email = auth.jwt()->>'email'
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_my_partner_requests() TO authenticated;

-- Option 3: If you're already linked with a partner, you can disable showing requests
-- This is handled in the app code now