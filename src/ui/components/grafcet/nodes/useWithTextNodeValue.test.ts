/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useWithTextNodeValue from "./useWithTextNodeValue"

jest.mock("../context/GrafcetContext")

type StepElement = {
	id: string
	data: Record<string, unknown>
	copy(): StepElement
	updateData(patch: Record<string, unknown>): void
}

function makeStepElement(data: Record<string, unknown>): StepElement {
	return {
		id: "node-1",
		data: { ...data },
		copy(): StepElement {
			return makeStepElement(this.data)
		},
		updateData(patch: Record<string, unknown>) {
			Object.assign(this.data, patch)
		},
	}
}

describe("useWithTextNodeValue", () => {
	const updateNodeData = jest.fn()
	const workflowManager = { updateNodeData }

	function setup(nodeData: Record<string, unknown>, valueProperty = "number", transformToNumber = true) {
		const element = makeStepElement(nodeData)
		const grafcet = { getElementById: jest.fn(() => element) }
		const store = { getState: jest.fn(() => ({ grafcet })) }
		;(useGrafcetContext as jest.Mock).mockReturnValue({ store })
		;(useGrafcetStore as jest.Mock).mockImplementation(selectorImplementation({ workflowManager }))
		return renderHook(() =>
			useWithTextNodeValue("node-1", "step", nodeData, valueProperty, transformToNumber),
		)
	}

	afterEach(() => jest.clearAllMocks())

	it("initializes the value from the node data", () => {
		const { result } = setup({ number: 3 })
		const [value] = result.current
		expect(value).toBe("3")
	})

	it("updates the value and clears the error for valid input", () => {
		const { result } = setup({ number: 3 })

		act(() => result.current[1]("5"))

		const [value, , , , , error] = result.current
		expect(value).toBe("5")
		expect(error).toBe(false)
	})

	it("reports an error when the value fails isolated validation", () => {
		// transformToNumberBeforeSave=false lets a non-integer string reach the analyser as-is;
		// with the default true it would be sanitized to "" or a valid integer beforehand.
		const { result } = setup({ number: 3 }, "number", false)

		act(() => result.current[1]("-1"))

		const [, , , , , error] = result.current
		expect(error).toBe("Le numéro de l'étape doit être un entier positif.")
	})

	it("saves the transformed value to the store", () => {
		const { result } = setup({ number: 3 })

		act(() => result.current[1]("7"))
		act(() => result.current[4]())

		expect(updateNodeData).toHaveBeenCalledWith("node-1", { number: 7 })
	})

	it("treats a non-numeric value as empty when transforming to number", () => {
		const { result } = setup({ number: 3 })

		act(() => result.current[1]("abc"))
		act(() => result.current[4]())

		expect(updateNodeData).toHaveBeenCalledWith("node-1", { number: "" })
	})

	it("resets to the node data value when leaving editing mode without saving", () => {
		const { result } = setup({ number: 3 })

		act(() => result.current[3](true)) // setEditing(true)
		act(() => result.current[1]("5"))
		expect(result.current[0]).toBe("5")

		act(() => result.current[3](false)) // setEditing(false), discarding the edit

		expect(result.current[0]).toBe("3")
	})
})
