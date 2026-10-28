import fs from "fs";
import path from "path";
import { FEATURED_TEMPLATE_ID } from "@/templates/index";
import frChrome from "@/i18n/messages/fr/chrome.json";
import enChrome from "@/i18n/messages/en/chrome.json";
import { isIllustration3dId } from "@/ui/components/3d-illustrations/Illustration3dSlot";
import { listStartupExamples, STARTUP_EXAMPLE_IDS } from "./startup-examples";

describe("listStartupExamples", () => {
	const examples = listStartupExamples();

	it("garde tous les exemples déclarés, chacun pourvu d'une solution", () => {
		expect(examples.map((e) => e.id).sort()).toEqual(
			[...STARTUP_EXAMPLE_IDS].sort(),
		);
		examples.forEach((e) => expect(e.template.solution).toBeDefined());
	});

	it("place l'exemple mis en avant en premier", () => {
		expect(examples[0].id).toBe(FEATURED_TEMPLATE_ID);
	});

	it("illustre chaque exemple par une image de scène existante", () => {
		examples.forEach((e) =>
			expect(
				fs.existsSync(path.join(process.cwd(), "public", e.imageUrl)),
			).toBe(true),
		);
	});

	it("dispose d'une accroche traduite pour chaque exemple", () => {
		STARTUP_EXAMPLE_IDS.forEach((id) => {
			expect(frChrome.startup.examples[id]).toBeTruthy();
			expect(enChrome.startup.examples[id]).toBeTruthy();
		});
	});

	it("décrit chaque illustration 3D d'exemple par son propre libellé d'accessibilité", () => {
		STARTUP_EXAMPLE_IDS.filter(isIllustration3dId).forEach((id) => {
			expect(frChrome.startup.sceneLabels[id]).toBeTruthy();
			expect(enChrome.startup.sceneLabels[id]).toBeTruthy();
		});
	});
});
