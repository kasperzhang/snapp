-- Snapp Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  favicon_url TEXT,
  og_image_url TEXT,
  domain TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0066FF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Bookmark-Tags junction table
CREATE TABLE bookmark_tags (
  bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, tag_id)
);

-- Folders table
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Folder-Bookmarks junction table
CREATE TABLE folder_bookmarks (
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, bookmark_id)
);

-- Indexes for better performance
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX idx_bookmarks_domain ON bookmarks(domain);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_bookmark_tags_bookmark_id ON bookmark_tags(bookmark_id);
CREATE INDEX idx_bookmark_tags_tag_id ON bookmark_tags(tag_id);
CREATE INDEX idx_folder_bookmarks_folder_id ON folder_bookmarks(folder_id);
CREATE INDEX idx_folder_bookmarks_bookmark_id ON folder_bookmarks(bookmark_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_bookmarks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Bookmarks policies
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Bookmark_tags policies
CREATE POLICY "Users can view their own bookmark tags"
  ON bookmark_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookmarks
      WHERE bookmarks.id = bookmark_tags.bookmark_id
      AND bookmarks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookmark tags for their bookmarks"
  ON bookmark_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookmarks
      WHERE bookmarks.id = bookmark_tags.bookmark_id
      AND bookmarks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own bookmark tags"
  ON bookmark_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bookmarks
      WHERE bookmarks.id = bookmark_tags.bookmark_id
      AND bookmarks.user_id = auth.uid()
    )
  );

-- Folders policies
CREATE POLICY "Users can view their own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- Folder_bookmarks policies
CREATE POLICY "Users can view their own folder bookmarks"
  ON folder_bookmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM folders
      WHERE folders.id = folder_bookmarks.folder_id
      AND folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add bookmarks to their folders"
  ON folder_bookmarks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM folders
      WHERE folders.id = folder_bookmarks.folder_id
      AND folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove bookmarks from their folders"
  ON folder_bookmarks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM folders
      WHERE folders.id = folder_bookmarks.folder_id
      AND folders.user_id = auth.uid()
    )
  );

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Site Analyses table (for web page scanning feature)
CREATE TABLE site_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screenshot_url TEXT,
  fonts JSONB,              -- [{family, weights, source, usage}]
  colors JSONB,             -- [{hex, rgb, frequency, context}]
  design_prompt TEXT,       -- Claude-generated replication guide
  design_tokens JSONB,      -- {tailwind, cssVariables}
  analysis_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for site_analyses
CREATE INDEX idx_site_analyses_bookmark_id ON site_analyses(bookmark_id);
CREATE INDEX idx_site_analyses_user_id ON site_analyses(user_id);

-- Enable RLS for site_analyses
ALTER TABLE site_analyses ENABLE ROW LEVEL SECURITY;

-- Site analyses policies
CREATE POLICY "Users can view their own site analyses"
  ON site_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own site analyses"
  ON site_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site analyses"
  ON site_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site analyses"
  ON site_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on site_analyses
CREATE TRIGGER update_site_analyses_updated_at
  BEFORE UPDATE ON site_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
