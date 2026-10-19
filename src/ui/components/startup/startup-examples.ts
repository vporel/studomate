import { listScenes } from "@/3d-scenes/scene.registry";
import {
	FEATURED_TEMPLATE_ID,
	PROJECT_TEMPLATES,
	type ProjectTemplate,
	type TemplateId,
} from "@/templates/index";

/** Each one has a pitch under `chrome.startup.examples.<id>`. */
export const STARTUP_EXAMPLE_IDS = [
	"crossroads",
	"carton-sorting",
	"drilling",
	"elevator",
] as const satisfies readonly TemplateId[];

export type StartupExampleId = (typeof STARTUP_EXAMPLE_IDS)[number];

export type StartupExample = {
	id: StartupExampleId;
	template: ProjectTemplate;
	imageUrl: string;
};

const latestScenes = listScenes();

/**
 * Startup examples, featured one first. An example is dropped when its template has no
 * solution or no scene sharing its id to illustrate it.
 */
export function listStartupExamples(): StartupExample[] {
	const examples = STARTUP_EXAMPLE_IDS.flatMap((id) => {
		const template = PROJECT_TEMPLATES.find((t) => t.id === id);
		const imageUrl = latestScenes.find((scene) => scene.id === id)?.imageUrl;
		return template?.solution && imageUrl ? [{ id, template, imageUrl }] : [];
	});
	return [
		...examples.filter((example) => example.id === FEATURED_TEMPLATE_ID),
		...examples.filter((example) => example.id !== FEATURED_TEMPLATE_ID),
	];
}
