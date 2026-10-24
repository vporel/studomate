/**
 * @jest-environment jsdom
 */
import { hasNoSkippedLevel, headingLevels } from "@tests/utils/headings";
import { renderWithI18n } from "@tests/utils/i18n";
import GettingStartedSection from "./GettingStartedSection";
import GrafcetSection from "./GrafcetSection";
import LadderSection from "./LadderSection";
import ProjectsSection from "./ProjectsSection";
import VariablesSection from "./VariablesSection";

describe("manual sections heading levels", () => {
	it.each([
		["GettingStartedSection", <GettingStartedSection key="a" />],
		["ProjectsSection", <ProjectsSection key="b" />],
		["VariablesSection", <VariablesSection key="c" />],
		["GrafcetSection", <GrafcetSection key="d" selected="grafcet" />],
		["LadderSection", <LadderSection key="e" selected="ladder" />],
	])("%s starts at h2 and skips no level", (_name, ui) => {
		const { container } = renderWithI18n(ui);
		const levels = headingLevels(container);

		expect(levels.length).toBeGreaterThan(1);
		expect(hasNoSkippedLevel(levels, 2)).toBe(true);
	});
});
