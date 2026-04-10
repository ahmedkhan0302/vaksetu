import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // If called from a Server Action or API Route, throw an error or handle
    // appropriately depending on context. For API routes, if we don't want 
    // to throw an actual next/navigation redirect (which returns 302), we 
    // can just return null and handle in the caller.
    return null;
  }
  
  return user
}
