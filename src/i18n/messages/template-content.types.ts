/**
 * Content of a project template (what ends up inside the created project, as opposed to the
 * catalog `label`/`description` of `templates.json`): the exercise statement and the texts
 * (project, program, network and widget names, comments...) read through `createTemplateText`.
 * `texts` values may contain `{name}` placeholders.
 */
export type TemplateContent = {
	statement?: string;
	texts: Record<string, string>;
};
