import {
	isDigit,
	isLetterOrUnderscore,
	isLetterOrUnderscoreOrDigit,
	isQuote,
} from "./alphabet";
import { Dialect } from "./dialect.enum";
import { getKeywordByString, getKeywordString } from "./keywords";

/**
 * Traduit les mots-clés d'une expression d'un dialecte vers un autre (`ET` → `AND`).
 *
 * Nécessaire parce que les expressions sont stockées **en texte** : changer le dialecte d'un
 * projet sans les réécrire rendrait `ET` méconnaissable, l'analyse le prenant alors pour un
 * identifiant inconnu.
 *
 * Même balayage tolérant que `IdentifierRenamer`, et pour la même raison : une expression en
 * cours d'édition est souvent momentanément invalide, et refuser de la traduire y laisserait
 * un mot-clé périmé. Ce qui n'est pas reconnu est recopié tel quel.
 *
 * Les identifiants ne sont jamais touchés : une variable nommée `AND` en dialecte FR reste
 * `AND` après passage en EN, même si elle y devient un mot-clé — l'analyse le signalera, ce
 * qui vaut mieux qu'un renommage silencieux.
 */
export default class KeywordTranslator {
	static translate(expression: string, from: Dialect, to: Dialect): string {
		if (!expression || from === to) return expression;

		let result = "";
		let position = 0;
		let segmentStart = 0;

		while (position < expression.length) {
			const char = expression[position];

			//Chaîne littérale : sautée en entier, son contenu n'est pas du code
			if (isQuote(char)) {
				const quote = char;
				position++;
				while (position < expression.length && expression[position] !== quote)
					position++;
				position++;
				continue;
			}

			//Nombre, unité de durée comprise (100ms), pour ne pas lire l'unité comme un mot
			if (isDigit(char)) {
				while (
					position < expression.length &&
					(isDigit(expression[position]) || expression[position] === ".")
				)
					position++;
				while (
					position < expression.length &&
					isLetterOrUnderscore(expression[position])
				)
					position++;
				continue;
			}

			if (isLetterOrUnderscore(char)) {
				const start = position;
				while (
					position < expression.length &&
					isLetterOrUnderscoreOrDigit(expression[position])
				)
					position++;
				const word = expression.slice(start, position);
				const keyword = getKeywordByString(word, from);
				if (keyword) {
					result +=
						expression.slice(segmentStart, start) +
						getKeywordString(keyword, to);
					segmentStart = position;
				}
				continue;
			}

			position++;
		}

		if (segmentStart === 0) return expression;
		return result + expression.slice(segmentStart);
	}
}
