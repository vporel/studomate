import type { PageData } from "@/ui/stores/project/project.store.types";
import getVisibleTabIds from "./visible-tab-ids";

const pagesData = {
	g1: { id: "g1", type: "grafcet", title: "G1" },
	h1: { id: "h1", type: "hmi", title: "H1" },
	h2: { id: "h2", type: "hmi", title: "H2" },
	"hmi-simulation": {
		id: "hmi-simulation",
		type: "hmi-simulation",
		title: "Simulation HMI",
	},
} as Record<string, PageData>;

describe("getVisibleTabIds", () => {
	it("keeps every tab while the HMI simulation tab is closed", () => {
		expect(getVisibleTabIds(["g1", "h1", "h2"], pagesData)).toEqual([
			"g1",
			"h1",
			"h2",
		]);
	});

	it("leaves the HMI pages out while the HMI simulation tab is open", () => {
		expect(
			getVisibleTabIds(["h1", "g1", "h2", "hmi-simulation"], pagesData),
		).toEqual(["g1", "hmi-simulation"]);
	});

	it("does not alter the order it is given", () => {
		const order = ["g1", "h1"];
		getVisibleTabIds(order, pagesData);
		expect(order).toEqual(["g1", "h1"]);
	});
});
