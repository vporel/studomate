import { createClient } from "@supabase/supabase-js";

/**
 * Repli sur une URL/clé factices quand les variables d'environnement ne sont pas
 * renseignées (tests, `npm run dev` sans `.env.local` encore configuré) : `createClient` lève
 * sinon dès l'import du module. Les appels réseau échoueront proprement à l'usage — géré par
 * chaque repository (`SaveResult` en échec, listes vides).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
