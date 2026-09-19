export type ProjectStatus = "unknown" | "online" | "offline" | "error";

/** Projeto como a UI ve: nenhum campo *_encrypted sai daqui. */
export type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  public_url: string | null;
  health_url: string | null;
  vercel_account_id: string | null;
  vercel_project_id: string | null;
  supabase_account_id: string | null;
  supabase_project_ref: string | null;
  supabase_url: string | null;
  database_host: string | null;
  database_name: string | null;
  license_email: string | null;
  license_expires_at: string | null;
  status: ProjectStatus;
  last_status_check: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Indica que existe segredo guardado, sem revelar o valor. */
  has_supabase_anon_key: boolean;
  has_database_url: boolean;
};

export type AccountSummary = {
  id: string;
  label: string;
  team_id?: string | null;
  has_token: boolean;
};
