import { createClient } from "@supabase/supabase-js";

/**
 * Repli sur une URL/clé factices quand les variables d'environnement ne sont pas
 * renseignées (tests, `npm run dev` sans `.env.local` encore configuré) : `createClient` lève
 * sinon dès l'import du module. `isSupabaseConfigured` permet aux couches supérieures de
 * désactiver proprement le cloud plutôt que de laisser des requêtes partir vers l'URL bidon.
 */
export const isSupabaseConfigured = Boolean(
	process.env.NEXT_PUBLIC_SUPABASE_URL &&
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!isSupabaseConfigured && process.env.NODE_ENV !== "test") {
	console.warn(
		"Cloud désactivé : NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY absentes — les projets restent en local uniquement.",
	);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
