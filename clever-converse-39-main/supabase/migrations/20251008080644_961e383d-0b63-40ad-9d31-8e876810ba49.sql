-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  font_size text default 'medium',
  interaction_style text default 'balanced',
  language text default 'en',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Create conversations table
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'New Conversation',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.conversations enable row level security;

create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can create their own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can create messages in their conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can delete messages in their conversations"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

-- Create conversation_threads table
create table public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  color text default '#3b82f6',
  icon text default 'MessageSquare',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.conversation_threads enable row level security;

create policy "Users can view their own threads"
  on public.conversation_threads for select
  using (auth.uid() = user_id);

create policy "Users can create their own threads"
  on public.conversation_threads for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own threads"
  on public.conversation_threads for update
  using (auth.uid() = user_id);

create policy "Users can delete their own threads"
  on public.conversation_threads for delete
  using (auth.uid() = user_id);

-- Create reminders table
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  remind_at timestamp with time zone not null,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.reminders enable row level security;

create policy "Users can view their own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "Users can create their own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reminders"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);

-- Create knowledge_cards table
create table public.knowledge_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  title text not null,
  content text not null,
  tags text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.knowledge_cards enable row level security;

create policy "Users can view their own knowledge cards"
  on public.knowledge_cards for select
  using (auth.uid() = user_id);

create policy "Users can create their own knowledge cards"
  on public.knowledge_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own knowledge cards"
  on public.knowledge_cards for update
  using (auth.uid() = user_id);

create policy "Users can delete their own knowledge cards"
  on public.knowledge_cards for delete
  using (auth.uid() = user_id);

-- Create mood_logs table
create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  mood text not null check (mood in ('happy', 'sad', 'anxious', 'calm', 'excited', 'tired', 'stressed', 'content')),
  intensity integer not null check (intensity >= 1 and intensity <= 10),
  note text,
  created_at timestamp with time zone default now()
);

alter table public.mood_logs enable row level security;

create policy "Users can view their own mood logs"
  on public.mood_logs for select
  using (auth.uid() = user_id);

create policy "Users can create their own mood logs"
  on public.mood_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own mood logs"
  on public.mood_logs for delete
  using (auth.uid() = user_id);

-- Create drafts table
create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  type text not null check (type in ('note', 'blog', 'code', 'email')),
  synced boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.drafts enable row level security;

create policy "Users can view their own drafts"
  on public.drafts for select
  using (auth.uid() = user_id);

create policy "Users can create their own drafts"
  on public.drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own drafts"
  on public.drafts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own drafts"
  on public.drafts for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Add triggers for updated_at columns
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at_column();

create trigger update_conversation_threads_updated_at
  before update on public.conversation_threads
  for each row execute function public.update_updated_at_column();

create trigger update_knowledge_cards_updated_at
  before update on public.knowledge_cards
  for each row execute function public.update_updated_at_column();

create trigger update_drafts_updated_at
  before update on public.drafts
  for each row execute function public.update_updated_at_column();

-- Create profile on user signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();