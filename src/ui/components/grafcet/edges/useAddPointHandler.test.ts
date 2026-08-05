/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useProjectStore } from "@/ui/components/projects/ProjectContext"
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext"
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useAddPointHandler, { getPointsForAdding } from "./useAddPointHandler"

jest.mock("@/ui/components/projects/ProjectContext")
jest.mock("@/ui/components/grafcet/context/GrafcetContext")

describe("getPointsForAdding", () => {
	it("returns the midpoints between consecutive points", () => {
		expect(getPointsForAdding([[0, 0], [10, 0], [10, 10]])).toEqual([[5, 0], [10, 5]])
	})

	it("returns an empty array for a single point", () => {
		expect(getPointsForAdding([[0, 0]])).toEqual([])
	})
})

describe("useAddPointHandler", () => {
	const updateEdgeData = jest.fn()
	const workflowManager = { updateEdgeData }

	function setup(mode: ProjectMode, points: [number, number][]) {
		;(useGrafcetStore as jest.Mock).mockImplementation(selectorImplementation({ workflowManager }))
		;(useProjectStore as jest.Mock).mockImplementation(selectorImplementation({ mode }))
		return renderHook(() => useAddPointHandler(points, "edge-1"))
	}

	afterEach(() => jest.clearAllMocks())

	it("exposes the midpoints as pointsForAdding", () => {
		const { result } = setup(ProjectMode.DESIGN, [[0, 0], [10, 0]])
		expect(result.current.pointsForAdding).toEqual([[5, 0]])
	})

	it("inserts a new point at the given index while designing", () => {
		const { result } = setup(ProjectMode.DESIGN, [[0, 0], [10, 0]])

		act(() => result.current.addPoint(0))

		expect(updateEdgeData).toHaveBeenCalledWith("edge-1", expect.any(Function))
		const updater = updateEdgeData.mock.calls[0][1]
		expect(updater({ points: [[0, 0], [10, 0]] })).toEqual({ points: [[0, 0], [5, 0], [10, 0]] })
	})

	it("does nothing outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION, [[0, 0], [10, 0]])

		act(() => result.current.addPoint(0))

		expect(updateEdgeData).not.toHaveBeenCalled()
	})
})
