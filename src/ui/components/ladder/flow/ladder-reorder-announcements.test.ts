import { identityT } from "@tests/utils/i18n";
import buildLadderReorderAnnouncements from "./ladder-reorder-announcements";

const active = (id: string) => ({ id }) as never;
const evt = (a: string, over: string | null = null) =>
	({ active: active(a), over: over ? active(over) : null }) as never;

describe("buildLadderReorderAnnouncements", () => {
	const announcements = buildLadderReorderAnnouncements(
		["a", "b", "c"],
		identityT,
	);

	it("annonce la saisie avec la position 1-based", () => {
		expect(announcements.onDragStart(evt("b"))).toBe("grabbed 2");
	});

	it("annonce le déplacement au-dessus d'une cible", () => {
		expect(announcements.onDragOver!(evt("a", "c"))).toBe("moved 1 3");
	});

	it("annonce la sortie de toute zone de dépôt", () => {
		expect(announcements.onDragOver!(evt("a"))).toBe("outside 1");
	});

	it("annonce le dépôt sur une cible et le dépôt sans cible", () => {
		expect(announcements.onDragEnd!(evt("a", "c"))).toBe("dropped 3");
		expect(announcements.onDragEnd!(evt("c"))).toBe("droppedInitial 3");
	});

	it("annonce l'annulation", () => {
		expect(announcements.onDragCancel!(evt("b"))).toBe("cancelled 2");
	});
});
