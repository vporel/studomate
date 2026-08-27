/**
 * Une migration par saut de version : elle reçoit un projet en version `from` et le rend en
 * version `from + 1`.
 *
 * Elle opère sur la **forme brute** du projet, avant toute reconstruction d'objet : c'est
 * justement parce que l'ancienne forme n'est plus constructible qu'il faut la migrer.
 *
 * Une migration ne doit jamais lever sur des données plausibles : y arriver signifie qu'un
 * utilisateur a déjà ces données. Ce qui n'est pas compréhensible est écarté, le reste passe.
 */
export type ProjectMigration = {
	from: number;
	description: string;
	migrate: (project: Record<string, unknown>) => Record<string, unknown>;
};

/** Projet écrit avant l'introduction du versionnement, reconnu à l'absence de `schemaVersion`. */
export const UNVERSIONED = 0;
