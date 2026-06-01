export interface Plugin {
  id: string;
  name: string;
  slug: string;
  description: string;
  author: string;
  version: string;
  category: string;
  enabled: boolean;
  manifest_json?: { permissions?: string[]; hooks?: Record<string, string> };
  created_at?: string;
}

export type CatalogPlugin = Omit<Plugin, 'id' | 'enabled' | 'created_at'>;
