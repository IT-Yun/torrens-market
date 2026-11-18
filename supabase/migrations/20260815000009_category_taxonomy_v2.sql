-- Category taxonomy v2 (ADR 007): demand-based ordering for the Adelaide
-- segment + two high-volume categories missing from v1.
update public.categories as c
set sort_order = v.sort_order
from (
  values
    ('furniture', 1),
    ('electronics', 2),
    ('cars_bikes', 3),
    ('home_kitchen', 4),
    ('clothing', 5),
    ('luxury', 8),
    ('cosmetics', 9),
    ('books', 10),
    ('food', 11),
    ('other', 12)
) as v (slug, sort_order)
where c.slug = v.slug;

insert into public.categories (slug, name_i18n, field_template, sort_order) values
(
  'sports',
  '{"ko": "스포츠/아웃도어", "en": "Sports & outdoors", "zh": "运动/户外"}',
  '[]',
  6
),
(
  'baby_kids',
  '{"ko": "유아/아동", "en": "Baby & kids", "zh": "母婴/儿童"}',
  '[]',
  7
)
on conflict (slug) do nothing;
