import type { PagesSession } from "@/persistence/pages-session.storage";
import type { VariablesPageId } from "@/ui/stores/project/variables-pages";
import type Project from "@/schemas/project/project.schema";

export type EmbeddedControl =
	| "mode"
	| "simulation"
	| "history"
	| "fullscreen"
	| "openInApp"
	| "watch"
	| "analysis"
	| "dialect";

type EmbeddedViewContent =
	| { type: "grafcet"; id: string }
	| { type: "ladder"; id: string }
	| { type: "hmi"; pageId: string }
	/**
	 * The 3D scene of the project. The scene runs with the simulation whether or not this view is
	 * listed: its sensors drive the matching input variables, which the watch table can then no
	 * longer set, and only this view offers the console that triggers its events.
	 */
	| { type: "scene3d" }
	/** A variables page of the application (inputs, outputs, memory or constants). */
	| { type: "variables"; pageId: VariablesPageId };

export type EmbeddedView = EmbeddedViewContent & {
	/** Freezes the view: its tab cannot be modified, whatever the mode. */
	locked?: boolean;
};

export type EmbeddedAppProps = {
	/** Read at mount only (copied); change the `key` to start again from another project. */
	project: Project;
	initialMode?: "design" | "simulation";
	editable?: boolean;
	controls?: EmbeddedControl[];
	views: EmbeddedView[];
	/** The view displayed first, one of `views`; the first of them by default. */
	initialView?: EmbeddedView;
	/** Opens the watch panel at mount; ignored when `initialMode` is `"design"`. */
	watchOpen?: boolean;
	/** Asks for confirmation when the tab is closed or reloaded while the project is modified. */
	warnOnLeave?: boolean;
	onDirtyChange?: (dirty: boolean) => void;
	/**
	 * Where the `"openInApp"` control leads, opened in a new tab: a link, or a function called at
	 * the click with the project and the tabs as they are then (to carry them along).
	 */
	appHref?: string | ((project: Project, pages: PagesSession) => string);
	height?: number | string;
};
