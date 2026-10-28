/**
 * @jest-environment jsdom
 */
import Project from "@/schemas/project/project.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { act, render } from "@testing-library/react";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { i18nWrapper } from "@tests/utils/i18n";
import { ProjectFactory } from "@tests/utils/project-factory";
import { useProjectContext } from "../projects/ProjectContext";
import type { EmbeddedView } from "./embedded-app.types";
import EmbeddedProjectProvider, {
	useEmbeddedViews,
} from "./EmbeddedProjectProvider";

type Store = NonNullable<ReturnType<typeof useProjectContext>>;

function createProject(): Project {
	return ProjectFactory.createWithGrafcets([
		GrafcetFactory.createSimpleCycle("g1"),
	]);
}

const GRAFCET_VIEWS: EmbeddedView[] = [{ type: "grafcet", id: "g1" }];

function mount(
	props: Partial<React.ComponentProps<typeof EmbeddedProjectProvider>> = {},
) {
	const probe: { store?: Store; views?: ReturnType<typeof useEmbeddedViews> } =
		{};
	const Probe = () => {
		probe.store = useProjectContext()!;
		probe.views = useEmbeddedViews();
		return null;
	};
	const project = props.project ?? createProject();
	const utils = render(
		<EmbeddedProjectProvider project={project} views={GRAFCET_VIEWS} {...props}>
			<Probe />
		</EmbeddedProjectProvider>,
		{ wrapper: i18nWrapper() },
	);
	return { ...utils, probe, project };
}

describe("EmbeddedProjectProvider", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		ProjectFactory.reset();
	});
	afterEach(() => jest.useRealTimers());

	it("opens a copy of the project, never the instance it was given", () => {
		const { probe, project } = mount();

		expect(probe.store!.getState().project).not.toBe(project);
		expect(probe.store!.getState().project!.id).toBe(project.id);
	});

	it("leaves the project it was given untouched when the copy is edited", () => {
		const { probe, project } = mount();
		const name = project.name;

		act(() => probe.store!.getState().setProjectName("Renamed"));

		expect(probe.store!.getState().project!.name).toBe("Renamed");
		expect(project.name).toBe(name);
	});

	it("opens the tabs of the views, the first one active", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1"),
			GrafcetFactory.createSimpleCycle("g2"),
		]);
		const { probe } = mount({
			project,
			views: [
				{ type: "grafcet", id: "g2" },
				{ type: "grafcet", id: "g1" },
			],
		});

		expect(probe.store!.getState().pagesOrder).toEqual(["g2", "g1"]);
		expect(probe.store!.getState().activePageId).toBe("g2");
		expect(probe.views!.map((view) => view.page.id)).toEqual(["g2", "g1"]);
	});

	it("turns a view missing from the project into an unavailable tab", () => {
		const { probe } = mount({ views: [{ type: "grafcet", id: "nope" }] });

		expect(probe.views![0].problem).toEqual({ reason: "grafcet", id: "nope" });
		expect(probe.store!.getState().pagesOrder).toEqual([
			"embedded-unavailable-0",
		]);
	});

	it("starts in design mode by default", () => {
		const { probe } = mount();

		expect(probe.store!.getState().mode).toBe(ProjectMode.DESIGN);
	});

	it("starts the simulation when asked to", () => {
		const { probe } = mount({ initialMode: "simulation" });

		expect(probe.store!.getState().mode).toBe(ProjectMode.SIMULATION);
	});

	it("stays in design mode, with the analysis open, when the simulation cannot start", () => {
		const project = ProjectFactory.createWithGrafcets([
			GrafcetFactory.createSimpleCycle("g1", "UNKNOWN_VARIABLE"),
		]);
		const { probe } = mount({ project, initialMode: "simulation" });

		expect(probe.store!.getState().mode).toBe(ProjectMode.DESIGN);
		expect(probe.store!.getState().ui.analysisResultVisible).toBe(true);
	});

	it("opens the watch panel at mount only in simulation", () => {
		const simulated = mount({ initialMode: "simulation", watchOpen: true });
		const designed = mount({ initialMode: "design", watchOpen: true });

		expect(simulated.probe.store!.getState().ui.watchTablesVisible).toBe(true);
		expect(designed.probe.store!.getState().ui.watchTablesVisible).toBe(false);
	});

	it("stops the simulation when unmounted", () => {
		const { probe, unmount } = mount({ initialMode: "simulation" });
		const store = probe.store!;

		unmount();

		expect(store.getState().mode).toBe(ProjectMode.DESIGN);
	});

	it("starts again from the project when the key changes", () => {
		const project = createProject();
		const probe: { store?: Store } = {};
		const Probe = () => {
			probe.store = useProjectContext()!;
			return null;
		};
		const ui = (key: string) => (
			<EmbeddedProjectProvider
				key={key}
				project={project}
				views={GRAFCET_VIEWS}
			>
				<Probe />
			</EmbeddedProjectProvider>
		);
		const { rerender } = render(ui("a"), { wrapper: i18nWrapper() });
		act(() => probe.store!.getState().setProjectName("Renamed"));

		rerender(ui("b"));
		const afterFirstReset = probe.store!.getState().project!.name;
		rerender(ui("c"));

		expect(afterFirstReset).toBe(project.name);
		expect(probe.store!.getState().project!.name).toBe(project.name);
	});

	it("ignores a new project reference without a new key", () => {
		const first = createProject();
		const probe: { store?: Store } = {};
		const Probe = () => {
			probe.store = useProjectContext()!;
			return null;
		};
		const ui = (project: Project) => (
			<EmbeddedProjectProvider project={project} views={GRAFCET_VIEWS}>
				<Probe />
			</EmbeddedProjectProvider>
		);
		const { rerender } = render(ui(first), { wrapper: i18nWrapper() });

		rerender(ui(ProjectFactory.createEmpty("Other")));

		expect(probe.store!.getState().project!.id).toBe(first.id);
	});

	describe("editable", () => {
		it("allows editing by default", () => {
			const { probe } = mount();

			expect(probe.store!.getState().editingEnabled).toBe(true);
		});

		it("refuses edits when false", () => {
			const { probe } = mount({ editable: false });

			act(() => probe.store!.getState().setProjectName("Renamed"));

			expect(probe.store!.getState().editingEnabled).toBe(false);
			expect(probe.store!.getState().project!.name).not.toBe("Renamed");
		});
	});

	describe("onDirtyChange", () => {
		it("reports the project becoming modified once", () => {
			const onDirtyChange = jest.fn();
			const { probe } = mount({ onDirtyChange });

			act(() => probe.store!.getState().setProjectName("Renamed"));
			expect(onDirtyChange).toHaveBeenLastCalledWith(true);
			act(() => probe.store!.getState().setProjectName("Renamed again"));
			expect(onDirtyChange).toHaveBeenCalledTimes(1);
		});

		it("does not report anything while nothing is modified", () => {
			const onDirtyChange = jest.fn();
			mount({ onDirtyChange });

			expect(onDirtyChange).not.toHaveBeenCalled();
		});
	});

	describe("warnOnLeave", () => {
		function leave() {
			const event = new Event("beforeunload", { cancelable: true });
			window.dispatchEvent(event);
			return event.defaultPrevented;
		}

		it("asks for confirmation when the project was modified", () => {
			const { probe } = mount({ warnOnLeave: true });
			act(() => probe.store!.getState().setProjectName("Renamed"));

			expect(leave()).toBe(true);
		});

		it("does not interfere while nothing was modified", () => {
			mount({ warnOnLeave: true });

			expect(leave()).toBe(false);
		});

		it("does nothing by default", () => {
			const { probe } = mount();
			act(() => probe.store!.getState().setProjectName("Renamed"));

			expect(leave()).toBe(false);
		});

		it("stops listening once unmounted", () => {
			const { probe, unmount } = mount({ warnOnLeave: true });
			act(() => probe.store!.getState().setProjectName("Renamed"));

			unmount();

			expect(leave()).toBe(false);
		});
	});
});
