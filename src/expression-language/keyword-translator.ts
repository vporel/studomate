import scanWords from "./scan-words";
import { Dialect } from "./dialect.enum";
import { getKeywordByString, getKeywordString } from "./keywords";

/**
 * Traduit les mots-clés d'une expression d'un dialecte vers un autre (`ET` → `AND`).
 *
 * Nécessaire parce que les expressions sont stockées **en texte** : changer le dialecte d'un
 * projet sans les réécrire rendrait `ET` méconnaissable, l'analyse le prenant alors pour un
 * identifiant inconnu.
 *
 * Les mots sont repérés par `scanWords`, tolérant aux expressions momentanément invalides :
 * refuser de traduire y laisserait un mot-clé périmé. Ce qui n'est pas reconnu est recopié
 * tel quel.
 *
 * Les identifiants ne sont jamais touchés : une variable nommée `AND` en dialecte FR reste
 * `AND` après passage en EN, même si elle y devient un mot-clé — l'analyse le signalera, ce
 * qui vaut mieux qu'un renommage silencieux.
 */
export default class KeywordTranslator {
	static translate(expression: string, from: Dialect, to: Dialect): string {
		if (!expression || from === to) return expression;

		let result = "";
		let segmentStart = 0;

		scanWords(expression, (word, start, end) => {
			const keyword = getKeywordByString(word, from);
			if (keyword) {
				result +=
					expression.slice(segmentStart, start) + getKeywordString(keyword, to);
				segmentStart = end;
			}
		});

		if (segmentStart === 0) return expression;
		return result + expression.slice(segmentStart);
	}
}
