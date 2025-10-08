-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON messages;

-- Create permissive policies for conversations (allow all operations)
CREATE POLICY "Allow all to view conversations"
  ON conversations FOR SELECT
  USING (true);

CREATE POLICY "Allow all to create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update conversations"
  ON conversations FOR UPDATE
  USING (true);

CREATE POLICY "Allow all to delete conversations"
  ON conversations FOR DELETE
  USING (true);

-- Create permissive policies for messages (allow all operations)
CREATE POLICY "Allow all to view messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Allow all to create messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update messages"
  ON messages FOR UPDATE
  USING (true);

CREATE POLICY "Allow all to delete messages"
  ON messages FOR DELETE
  USING (true);