export const profileIds = ['industrial', 'consumer-staples', 'bank', 'holding',
  'fii-logistics', 'fii-shopping', 'fii-credit', 'etf-broad', 'etf-dividend'] as const;
export type ProfileId = typeof profileIds[number];
