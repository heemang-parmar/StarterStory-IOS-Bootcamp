# Partner Feature Debug Guide

## Common Issues & Solutions

### 1. No pending invitations showing up

**Possible causes:**
- Database tables not created
- No partner requests exist yet
- Query errors

**How to test:**

1. **Check if tables exist in Supabase:**
   - Go to Supabase Dashboard → SQL Editor
   - Run: `SELECT * FROM partner_requests;`
   - If error "relation does not exist", run the `partner-schema.sql` file

2. **Create a test partner request manually:**
   ```sql
   -- Replace with actual user IDs and emails
   INSERT INTO partner_requests (sender_id, recipient_email, status)
   VALUES ('your-user-id-here', 'partner@email.com', 'pending');
   ```

3. **Check console logs:**
   - Open the app with console/debugger
   - Look for logs starting with "Loaded partner requests:"
   - Check for any error messages

### 2. Testing the Partner Flow

**To test with two users:**

1. **User A (Sender):**
   - Go to Settings → Partner
   - Tap "Add Partner"
   - Enter User B's email
   - Send invitation

2. **User B (Recipient):**
   - Go to Settings → Partner
   - Should see "Pending Invitations"
   - Accept the request

3. **Both Users:**
   - Partner tab should appear
   - Can share recipes between each other

### 3. Manual Database Checks

Run these queries in Supabase SQL Editor:

```sql
-- Check all partner requests
SELECT pr.*, 
       sender.email as sender_email,
       sender.id as sender_user_id
FROM partner_requests pr
LEFT JOIN auth.users sender ON pr.sender_id = sender.id
ORDER BY pr.created_at DESC;

-- Check partnerships
SELECT * FROM partnerships;

-- Check if current user has any requests
SELECT * FROM partner_requests 
WHERE sender_id = 'YOUR_USER_ID' 
   OR recipient_email = 'YOUR_EMAIL';
```

### 4. Quick Fix if Not Working

If the partner section isn't showing invitations:

1. **Ensure database is set up:**
   ```sql
   -- Run the entire partner-schema.sql file in Supabase
   ```

2. **Check RLS policies:**
   ```sql
   -- Verify policies exist
   SELECT * FROM pg_policies WHERE tablename = 'partner_requests';
   ```

3. **Test with RLS disabled temporarily:**
   - Go to Supabase → Authentication → Policies
   - Temporarily disable RLS on partner_requests table
   - Test if requests show up
   - Re-enable RLS after testing

### 5. Create Test Data

To quickly test the UI with sample data:

```sql
-- Get your user details first
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Create a test incoming request
INSERT INTO partner_requests (sender_id, recipient_email, status)
VALUES (
  'some-other-user-id', -- Replace with another user's ID
  'your@email.com',     -- Your email
  'pending'
);

-- Create a test outgoing request
INSERT INTO partner_requests (sender_id, recipient_email, status)
VALUES (
  'your-user-id',          -- Your user ID
  'partner@example.com',   -- Partner's email
  'pending'
);
```

### 6. Common Error Messages

- **"relation partner_requests does not exist"** - Tables not created, run schema
- **"permission denied"** - RLS policy issue, check policies
- **Empty results** - No data exists, create test requests
- **Network error** - Check Supabase connection and API keys

### 7. Debugging Steps

1. Open browser console/React Native debugger
2. Check Settings page console logs for:
   - "Loaded partner requests: X requests"
   - "Current user email: ..."
   - "Current user ID: ..."
3. Verify the email matches exactly (case-sensitive)
4. Check network tab for Supabase API calls

If still not working, the issue is likely:
- Database tables/policies not created
- No actual partner requests in the database
- Email case mismatch (emails are case-sensitive in queries)