-- Sean (2026-08-30): sellers must be able to skip fields they can't answer
-- (unknown brand/model, unknown size) — only essentials stay required.
-- Kept required: cars_bikes.year + odometer_km (defines a car listing),
-- food.best_before and cosmetics.opened (buyer safety, trivial to answer).
-- Made optional: electronics.brand_model, clothing.size, luxury.brand.
update public.categories
set field_template = (
  select jsonb_agg(
    case when f->>'key' in ('brand_model', 'size', 'brand') then f - 'required' || '{"required": false}'::jsonb
         else f end)
  from jsonb_array_elements(field_template) f)
where slug in ('electronics', 'clothing', 'luxury');
