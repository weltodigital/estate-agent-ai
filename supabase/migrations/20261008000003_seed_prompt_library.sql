-- Global prompt library (org_id null). Rendered per branch into branch_prompts.
-- {town} is the branch town; {area} templates are rendered once per branch area.

insert into public.prompts (template, intent_group, uses_area, sort_order) values
  -- Selling
  ('best estate agent in {town}', 'selling', false, 10),
  ('who should I sell my house with in {town}', 'selling', false, 11),
  ('most recommended estate agent in {town}', 'selling', false, 12),
  ('which estate agent in {town} sells houses fastest', 'selling', false, 13),
  ('I''m selling a family home in {town}, which agent should I use', 'selling', false, 14),
  ('best estate agent in {area}', 'selling', true, 15),
  ('most recommended estate agent in {area}, {town}', 'selling', true, 16),
  -- Valuation
  ('who gives accurate house valuations in {town}', 'valuation', false, 20),
  ('best estate agent for a free valuation in {town}', 'valuation', false, 21),
  ('which agent should value my house in {area}', 'valuation', true, 22),
  -- Letting
  ('best letting agent in {town}', 'letting', false, 30),
  ('reliable letting agent in {town}', 'letting', false, 31),
  ('best letting agent in {area}', 'letting', true, 32),
  -- Landlord
  ('best letting agent in {town} for landlords', 'landlord', false, 40),
  ('which letting agent in {town} has the best property management for landlords', 'landlord', false, 41),
  ('fully managed letting agent {town} recommendations', 'landlord', false, 42),
  -- Comparison / trust
  ('highest rated estate agents in {town}', 'comparison', false, 50),
  ('estate agents with the best reviews in {town}', 'comparison', false, 51),
  ('which estate agents in {town} are trustworthy', 'comparison', false, 52),
  ('compare estate agents in {town}', 'comparison', false, 53);

-- Rule weights start uniform; see packages/core/src/rules.
insert into public.rule_weights (rule_id) values
  ('review_gap'), ('missing_schema'), ('citation_gap'), ('missing_area_pages'),
  ('robots_blocks_ai'), ('missing_faq'), ('missing_llms_txt'), ('missing_valuation_page');
