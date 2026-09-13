/**
 * Sérialise un objet JSON-LD pour `dangerouslySetInnerHTML` : les `<` sont échappés pour
 * empêcher une balise `</script>` injectée depuis une valeur traduite de casser la page.
 */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}
