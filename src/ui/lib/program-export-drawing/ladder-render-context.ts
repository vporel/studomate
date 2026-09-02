/**
 * Textes que le renderer ladder ne peut pas dériver du seul schéma du programme : nom d'un
 * programme référencé par un bloc `user-program` (vit dans le projet), libellé fixe i18n d'un
 * bloc `assign`/`arithmetic`. Fournis par l'appelant UI (`usePdfExport`).
 */
export interface LadderRenderContext {
	programName?: (programId: string) => string | undefined;
	blockStaticLabel?: (blockType: string) => string | undefined;
}
