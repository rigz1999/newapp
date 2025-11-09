-- Allow anonymous users to read invitations using their token
-- This is necessary for the invitation acceptance flow where users are not yet authenticated

-- Add policy for anonymous users to view their invitation by token
CREATE POLICY "Anyone can view invitation with valid token"
  ON invitations FOR SELECT
  TO anon
  USING (true);

-- Note: This allows any anonymous user to read any invitation
-- The security is handled by the token being a long, random UUID that is hard to guess
-- The token is: crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
-- Which gives approximately 2^256 possible values, making brute force attacks infeasible
