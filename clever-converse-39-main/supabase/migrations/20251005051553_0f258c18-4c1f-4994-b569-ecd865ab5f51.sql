-- Drop the foreign key constraint on conversations table to allow guest users
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;