-- The county added to questions when another UK town or village shares the
-- branch town's name ("Newport, Isle of Wight"). Null when the name is unique.
alter table public.branches add column if not exists county text;
