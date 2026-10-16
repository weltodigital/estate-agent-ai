-- Area questions now name the town ("best estate agent in Drayton,
-- Portsmouth"), because small places share names across the country.
-- Update questions already generated from the library, unless the user has
-- edited them. The demo keeps its text so its stored answers still line up.
update public.branch_prompts bp
set text = replace(p.template, '{area}', bp.area || ', ' || b.town)
from public.prompts p, public.branches b, public.organisations o
where bp.prompt_id = p.id
  and b.id = bp.branch_id
  and o.id = b.org_id
  and not o.is_demo
  and p.uses_area
  and p.template not like '%{town}%'
  and bp.area is not null
  and lower(bp.area) <> lower(b.town)
  and bp.text = replace(p.template, '{area}', bp.area);
