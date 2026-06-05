create or replace function feedbacks_over_time(from_date timestamptz, to_date timestamptz)
returns table(date text, count bigint)
language sql
as $$
  select
    to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
    count(*)::bigint as count
  from feedback_posts
  where created_at >= from_date
    and created_at <= to_date
  group by date_trunc('day', created_at)
  order by date_trunc('day', created_at) asc;
$$;
