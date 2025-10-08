-- Drop the foreign key constraint that's preventing guest profiles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- The profiles table should accept both auth users and guest session IDs
-- No need to add it back since guests use arbitrary UUIDs