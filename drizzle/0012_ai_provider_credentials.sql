ALTER TABLE `integrations`
MODIFY COLUMN `type` enum(
  'kommo',
  'asaas',
  'google_sheets',
  'gtm',
  'meta_pixel',
  'meta_capi',
  'google_ads',
  'google_ads_enhanced',
  'excel_graph_api',
  'power_bi',
  'crm_hubspot',
  'crm_rd_station',
  'server_side_gtm',
  'anthropic',
  'openai'
) NOT NULL;
