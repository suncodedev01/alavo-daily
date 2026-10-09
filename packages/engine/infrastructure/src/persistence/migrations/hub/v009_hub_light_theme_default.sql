UPDATE hub_settings
SET value_json = json_set(value_json, '$.theme', 'light')
WHERE id = 'app' AND json_extract(value_json, '$.theme') = 'system';
