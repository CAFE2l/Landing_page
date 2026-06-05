alter table feedback_posts
  add column if not exists downvote_count integer default 0,
  add column if not exists upvote_count integer default 0,
  add column if not exists media_urls text[] default '{}',
  add column if not exists media_types text[] default '{}';
