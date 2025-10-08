-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Create new policy that allows both authenticated users and guest sessions
CREATE POLICY "Allow all to create profiles"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- Update the select policy to allow all as well
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Allow all to view profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Update the update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Allow all to update profiles"
ON public.profiles
FOR UPDATE
USING (true);