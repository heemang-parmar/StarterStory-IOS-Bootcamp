-- Partner functionality database schema

-- Create partner_requests table to track partnership invitations
CREATE TABLE IF NOT EXISTS partner_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Create partnerships table to store linked partner relationships
CREATE TABLE IF NOT EXISTS partnerships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure users can't partner with themselves
    CONSTRAINT different_users CHECK (user1_id != user2_id),
    -- Ensure unique partnerships (no duplicates in either direction)
    CONSTRAINT unique_partnership UNIQUE (user1_id, user2_id)
);

-- Create shared_recipes table to track recipes shared between partners
CREATE TABLE IF NOT EXISTS shared_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    message TEXT,
    CONSTRAINT unique_share UNIQUE (recipe_id, shared_by, shared_with)
);

-- Create recipe_reactions table to store like/dislike reactions
CREATE TABLE IF NOT EXISTS recipe_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shared_recipe_id UUID REFERENCES shared_recipes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure one reaction per user per shared recipe
    CONSTRAINT unique_reaction UNIQUE (shared_recipe_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_reactions ENABLE ROW LEVEL SECURITY;

-- Partner requests policies
CREATE POLICY "Users can view their own sent requests" ON partner_requests 
    FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Users can view requests sent to them" ON partner_requests 
    FOR SELECT USING (
        recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can create partner requests" ON partner_requests 
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests sent to them" ON partner_requests 
    FOR UPDATE USING (
        recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Partnerships policies
CREATE POLICY "Users can view their partnerships" ON partnerships 
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create partnerships" ON partnerships 
    FOR INSERT WITH CHECK (true); -- Will be created via function

-- Shared recipes policies
CREATE POLICY "Users can view recipes shared with them" ON shared_recipes 
    FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can share their own recipes" ON shared_recipes 
    FOR INSERT WITH CHECK (
        auth.uid() = shared_by AND 
        EXISTS (SELECT 1 FROM recipes WHERE id = recipe_id AND user_id = auth.uid())
    );

-- Recipe reactions policies
CREATE POLICY "Users can view reactions on shared recipes" ON recipe_reactions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shared_recipes sr 
            WHERE sr.id = shared_recipe_id 
            AND (sr.shared_by = auth.uid() OR sr.shared_with = auth.uid())
        )
    );

CREATE POLICY "Users can add reactions to recipes shared with them" ON recipe_reactions 
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM shared_recipes sr 
            WHERE sr.id = shared_recipe_id 
            AND sr.shared_with = auth.uid()
        )
    );

CREATE POLICY "Users can update their own reactions" ON recipe_reactions 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON recipe_reactions 
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS partner_requests_sender_idx ON partner_requests(sender_id);
CREATE INDEX IF NOT EXISTS partner_requests_recipient_idx ON partner_requests(recipient_email);
CREATE INDEX IF NOT EXISTS partnerships_user1_idx ON partnerships(user1_id);
CREATE INDEX IF NOT EXISTS partnerships_user2_idx ON partnerships(user2_id);
CREATE INDEX IF NOT EXISTS shared_recipes_shared_by_idx ON shared_recipes(shared_by);
CREATE INDEX IF NOT EXISTS shared_recipes_shared_with_idx ON shared_recipes(shared_with);
CREATE INDEX IF NOT EXISTS recipe_reactions_shared_recipe_idx ON recipe_reactions(shared_recipe_id);

-- Function to get partner for a user
CREATE OR REPLACE FUNCTION get_partner(user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT CASE 
            WHEN user1_id = user_id THEN user2_id 
            ELSE user1_id 
        END
        FROM partnerships
        WHERE user1_id = user_id OR user2_id = user_id
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to accept partner request and create partnership
CREATE OR REPLACE FUNCTION accept_partner_request(request_id UUID)
RETURNS void AS $$
DECLARE
    sender_user_id UUID;
    recipient_user_id UUID;
BEGIN
    -- Get the request details
    SELECT sender_id INTO sender_user_id
    FROM partner_requests
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already processed';
    END IF;
    
    -- Get recipient user ID from their email
    SELECT id INTO recipient_user_id
    FROM auth.users
    WHERE email = (
        SELECT recipient_email 
        FROM partner_requests 
        WHERE id = request_id
    );
    
    -- Update request status
    UPDATE partner_requests
    SET status = 'accepted', responded_at = NOW()
    WHERE id = request_id;
    
    -- Create partnership (ensure consistent ordering)
    INSERT INTO partnerships (user1_id, user2_id)
    SELECT 
        LEAST(sender_user_id, recipient_user_id),
        GREATEST(sender_user_id, recipient_user_id)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user_profiles policy to allow partners to view each other's profiles
DROP POLICY IF EXISTS "Users can view own profiles" ON user_profiles;
CREATE POLICY "Users can view own and partner profiles" ON user_profiles 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        user_id = get_partner(auth.uid())
    );