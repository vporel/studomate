/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ManualTrainingLink from "./ManualTrainingLink";

describe("ManualTrainingLink", () => {
	it.each([
		[
			"grafcet",
			"Apprendre le GRAFCET pas à pas, avec des exercices corrigés",
			"/formations/a1",
		],
		[
			"grafcet-steps",
			"Apprendre le GRAFCET pas à pas, avec des exercices corrigés",
			"/formations/a1",
		],
		[
			"ladder-contacts",
			"Apprendre le Ladder pas à pas, avec des exercices corrigés",
			"/formations/a2",
		],
		[
			"getting-started",
			"Suivre la formation GRAFCET et Ladder gratuite",
			"/formations",
		],
	])("links the %s section to its course", (selected, name, href) => {
		renderWithI18n(<ManualTrainingLink selected={selected} />);

		expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
	});

	it.each(["intro", "shortcuts", "hmi-widgets", "cross-references"])(
		"renders nothing for the %s section",
		(selected) => {
			const { container } = renderWithI18n(
				<ManualTrainingLink selected={selected} />,
			);

			expect(container).toBeEmptyDOMElement();
		},
	);
});
