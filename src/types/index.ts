export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  domain: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface BookmarkTag {
  bookmark_id: string;
  tag_id: string;
}

export interface BookmarkWithRelations extends Bookmark {
  tags: Tag[];
}

export interface URLMetadata {
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  domain: string;
}

export interface CreateBookmarkInput {
  url: string;
  title?: string;
  description?: string;
  favicon_url?: string;
  og_image_url?: string;
  tag_ids?: string[];
}

export interface UpdateBookmarkInput {
  title?: string;
  description?: string;
  tag_ids?: string[];
}

export interface CreateTagInput {
  name: string;
  color?: string;
}
