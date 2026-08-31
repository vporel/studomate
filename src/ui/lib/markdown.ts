/**
 * Rend un texte Markdown en HTML assaini, prêt à être injecté via `dangerouslySetInnerHTML`.
 *
 * `marked` et `dompurify` sont importés dynamiquement : le rendu d'un énoncé ne sert que sur
 * la page dédiée, rarement ouverte, et ces librairies n'ont pas à alourdir le bundle initial.
 */
export default async function renderMarkdown(source: string): Promise<string> {
	const [{ marked }, { default: DOMPurify }] = await Promise.all([
		import("marked"),
		import("dompurify"),
	]);
	const html = await marked.parse(source, {
		async: true,
		gfm: true,
		breaks: true,
	});
	return DOMPurify.sanitize(html);
}
