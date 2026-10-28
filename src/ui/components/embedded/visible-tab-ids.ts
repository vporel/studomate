import type { PageData } from "@/ui/stores/project/project.store.types";
import { HMI_SIMULATION_PAGE_ID } from "@/ui/stores/project/managers/hmi.manager";

/**
 * The tabs shown in the bar: while the HMI simulation tab is open it stands for the HMI pages,
 * which stay mounted but out of the bar.
 */
export default function getVisibleTabIds(
	pagesOrder: readonly string[],
	pagesData: Record<string, PageData>,
): string[] {
	if (!pagesOrder.includes(HMI_SIMULATION_PAGE_ID)) return [...pagesOrder];
	return pagesOrder.filter((id) => pagesData[id]?.type !== "hmi");
}
