-- Hotfix: mig 030 locked listings to column-level grants; the ADR-020 columns
-- added in mig 051/053 (flaw_note, has_flaws) were never granted, so any client
-- insert/update that includes them failed with "permission denied for table
-- listings" (Sean, build-15 soak, 2026-08-31). Grant exactly those two columns.
grant insert (flaw_note, has_flaws) on public.listings to authenticated;
grant update (flaw_note, has_flaws) on public.listings to authenticated;
-- listing_photos.section: table-level insert is still granted (no column lock there),
-- but be explicit in case a future lock lands.
grant insert (section) on public.listing_photos to authenticated;
grant update (section) on public.listing_photos to authenticated;
