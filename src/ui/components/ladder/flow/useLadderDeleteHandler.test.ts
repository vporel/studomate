/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import Section from "@/schemas/ladder/section.schema";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useLadderDeleteHandler from "./useLadderDeleteHandler";

jest.mock("../context/LadderContext", () => ({
	useLadderStore: jest.fn(),
}));

describe("useLadderDeleteHandler", () => {
	const deleteElements = jest.fn();
	const workflowManager = { deleteElements };

	afterEach(() => jest.clearAllMocks());

	function setup(section: Section) {
		(useLadderStore as jest.Mock).mockImplementation(selectorImplementation({ workflowManager }));
		return renderHook(() => useLadderDeleteHandler(section));
	}

	it("délègue au WorkflowManager avec les ids des nœuds et arêtes supprimés", () => {
		const section = new Section("s1", "S");
		const { result } = setup(section);

		result.current({ nodes: [{ id: "n1" } as any, { id: "n2" } as any], edges: [{ id: "e1" } as any] });

		expect(deleteElements).toHaveBeenCalledWith(section.id, ["n1", "n2"], ["e1"]);
	});
});
