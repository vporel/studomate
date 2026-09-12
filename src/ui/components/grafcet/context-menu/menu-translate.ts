/** Traducteur passé aux constructeurs de menus contextuels du grafcet (namespace
 * `grafcetEditor.menu`), pour qu'ils restent de simples fonctions sans hook. */
export type MenuTranslate = (
	key: string,
	values?: Record<string, string | number>,
) => string;
