import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { ContextMenuItemBaseType } from "@/ui/lib/context-menu/context-menu";
import executionMenuItems from "./execution-menu-items";

const t = (key: string) => key;

function onlyItem(groups: ReturnType<typeof executionMenuItems>) {
	expect(groups).toHaveLength(1);
	expect(groups[0]).toHaveLength(1);
	return groups[0][0] as ContextMenuItemBaseType;
}

describe("executionMenuItems", () => {
	const manager = { setExcludedFromExecution: jest.fn() };

	afterEach(() => jest.clearAllMocks());

	it("offers to exclude an executed program", () => {
		const item = onlyItem(
			executionMenuItems(new Grafcet("g1", "G"), manager, true, t),
		);

		expect(item.label).toBe("excludeFromExecution");
		expect(item.disabled).toBe(false);
		item.onClick?.();
		expect(manager.setExcludedFromExecution).toHaveBeenCalledWith("g1", true);
	});

	it("offers to include an excluded program", () => {
		const ladder = new Ladder("l1", "L");
		ladder.excludedFromExecution = true;

		const item = onlyItem(executionMenuItems(ladder, manager, true, t));

		expect(item.label).toBe("includeInExecution");
		item.onClick?.();
		expect(manager.setExcludedFromExecution).toHaveBeenCalledWith("l1", false);
	});

	it("disables the item outside design mode", () => {
		const item = onlyItem(
			executionMenuItems(new Grafcet("g1", "G"), manager, false, t),
		);

		expect(item.disabled).toBe(true);
	});

	it("offers nothing for the Main", () => {
		const main = new Ladder("m", "Main", undefined, "main");

		expect(executionMenuItems(main, manager, true, t)).toEqual([]);
	});

	it("offers nothing for an unknown program", () => {
		expect(executionMenuItems(undefined, manager, true, t)).toEqual([]);
	});
});
