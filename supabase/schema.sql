-- SOS Web App Database Schema

-- Custom types
CREATE TYPE user_role AS ENUM ('client', 'expert', 'admin');

-- Profiles Table (Extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    phone TEXT,
    email TEXT,
    full_name TEXT,
    role user_role DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS setup for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- Sessions Table
CREATE TABLE public.sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.profiles(id),
    expert_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INT DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Clients can see their own sessions
CREATE POLICY "Clients can view own sessions." 
ON public.sessions FOR SELECT 
USING (auth.uid() = client_id);

-- Clients can insert own sessions
CREATE POLICY "Clients can insert own sessions." 
ON public.sessions FOR INSERT 
WITH CHECK (auth.uid() = client_id);

-- Experts can see their assigned sessions
CREATE POLICY "Experts can view assigned sessions." 
ON public.sessions FOR SELECT 
USING (auth.uid() = expert_id);

-- Admins can see and edit all sessions
CREATE POLICY "Admins have full access to sessions." 
ON public.sessions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);


-- Seeding test expert 'Shravani Reddy'
-- 1. Insert into auth.users (idempotent setup)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '789e4567-e89b-12d3-a456-426614174000',
    'authenticated',
    'authenticated',
    'shravani@sos.com',
    crypt('secure_password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Shravani Reddy", "role": "expert"}',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert into public.profiles (idempotent update)
INSERT INTO public.profiles (
    id,
    phone,
    email,
    full_name,
    role
) VALUES (
    '789e4567-e89b-12d3-a456-426614174000',
    '+919876543210',
    'shravani@sos.com',
    'Shravani Reddy',
    'expert'
)
ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
