import buildLadderReorderAnnouncements from "./ladder-reorder-announcements";

const active = (id: string) => ({ id }) as never;
const evt = (a: string, over: string | null = null) =>
	({ active: active(a), over: over ? active(over) : null }) as never;

describe("buildLadderReorderAnnouncements", () => {
	const announcements = buildLadderReorderAnnouncements(["a", "b", "c"]);

	it("annonce la saisie avec la position 1-based", () => {
		expect(announcements.onDragStart(evt("b"))).toBe("Section 2 saisie.");
	});

	it("annonce le déplacement au-dessus d'une cible", () => {
		expect(announcements.onDragOver!(evt("a", "c"))).toBe(
			"Section 1 déplacée en position 3.",
		);
	});

	it("annonce la sortie de toute zone de dépôt", () => {
		expect(announcements.onDragOver!(evt("a"))).toBe(
			"Section 1 n'est plus au-dessus d'une zone de dépôt.",
		);
	});

	it("annonce le dépôt sur une cible et le dépôt sans cible", () => {
		expect(announcements.onDragEnd!(evt("a", "c"))).toBe(
			"Section déposée en position 3.",
		);
		expect(announcements.onDragEnd!(evt("c"))).toBe(
			"Section 3 déposée à sa position initiale.",
		);
	});

	it("annonce l'annulation", () => {
		expect(announcements.onDragCancel!(evt("b"))).toBe(
			"Déplacement annulé. Section 2 remise à sa position initiale.",
		);
	});
});
