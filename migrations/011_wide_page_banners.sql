BEGIN;

-- Page banners are a very wide strip (roughly 1920x290). The 4:3 scene artwork
-- had to be scaled about 1.6x to cover it, leaving a hugely magnified sliver on
-- screen. These replacements are drawn at 1920x620, so the same box crops gently.

UPDATE cms_singletons SET data = jsonb_set(data,'{products}',(data->'products') || '{"image":"/assets/industrial/banner-terminal.svg","imageAlt":"LPG storage and cylinder dispatch terminal"}'::jsonb,false), updated_at=NOW() WHERE key='page-heroes';

UPDATE cms_singletons SET data = jsonb_set(data,'{journey}',(data->'journey') || '{"image":"/assets/industrial/banner-plant.svg","imageAlt":"Bulk LPG installation at an industrial site"}'::jsonb,false), updated_at=NOW() WHERE key='page-heroes';

UPDATE cms_singletons SET data = jsonb_set(data,'{achievements}',(data->'achievements') || '{"image":"/assets/industrial/banner-terminal.svg","imageAlt":"LPG storage and cylinder dispatch terminal"}'::jsonb,false), updated_at=NOW() WHERE key='page-heroes';

UPDATE cms_singletons SET data = jsonb_set(data,'{gallery}',(data->'gallery') || '{"image":"/assets/industrial/banner-service.svg","imageAlt":"Commercial kitchen line and the MBGA account desk"}'::jsonb,false), updated_at=NOW() WHERE key='page-heroes';

UPDATE cms_singletons SET data = jsonb_set(data,'{contact}',(data->'contact') || '{"image":"/assets/industrial/banner-service.svg","imageAlt":"MBGA account desk coordinating commercial LPG supply"}'::jsonb,false), updated_at=NOW() WHERE key='page-heroes';

COMMIT;
