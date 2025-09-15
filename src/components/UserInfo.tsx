import { createServerOnlyClient } from "@/lib/supabase.server";

export async function UserInfo() {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  return (
    <div className="hidden sm:block text-right">
      <p className="text-sm font-medium text-crm-text-primary">
        {user.email?.split('@')[0] || 'Usuario'}
      </p>
      <p className="text-xs text-crm-text-muted">
        {user.email || 'usuario@amersur.com'}
      </p>
    </div>
  );
}
