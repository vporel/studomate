/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import {
	BlockPortSpec,
	ParameterPinRow,
} from "@/schemas/ladder/block-port.schema";
import Variable from "@/schemas/variable/variable.schema";
import ParamPinRow from "./ParamPinRow";

const paramPinProps = jest.fn();

jest.mock("./ParamPin", () => ({
	__esModule: true,
	default: (props: {
		side: string;
		spec: BlockPortSpec;
		value: string;
		liveMnemonic?: string;
		validate?: (variable: Variable) => string | null;
		onCommit: (value: string) => void;
	}) => {
		paramPinProps(props);
		return (
			<button
				data-testid={`pin-${props.side}`}
				onClick={() => props.onCommit("next")}
			>
				{props.spec.suffix}={props.value}
			</button>
		);
	},
}));

function spec(suffix: string, direction: "input" | "output"): BlockPortSpec {
	return {
		suffix,
		type: "TIME",
		kind: "parameter",
		direction,
		generatesVariable: false,
	};
}

function setup(
	row: ParameterPinRow,
	extra: Partial<React.ComponentProps<typeof ParamPinRow>> = {},
) {
	const onCommit = jest.fn();
	render(
		<ParamPinRow
			top={20}
			row={row}
			getValue={(suffix) => `v-${suffix}`}
			onCommit={onCommit}
			{...extra}
		/>,
	);
	return { onCommit };
}

describe("ParamPinRow", () => {
	afterEach(() => jest.clearAllMocks());

	it("affiche une entrée à gauche et une sortie à droite avec leurs valeurs", () => {
		setup({ input: spec("PT", "input"), output: spec("ET", "output") });

		expect(screen.getByTestId("pin-left")).toHaveTextContent("PT=v-PT");
		expect(screen.getByTestId("pin-right")).toHaveTextContent("ET=v-ET");
	});

	it("n'affiche que l'entrée quand la ligne n'a pas de sortie", () => {
		setup({ input: spec("PV", "input") });

		expect(screen.getByTestId("pin-left")).toBeInTheDocument();
		expect(screen.queryByTestId("pin-right")).not.toBeInTheDocument();
	});

	it("n'affiche que la sortie quand la ligne n'a pas d'entrée", () => {
		setup({ output: spec("CV", "output") });

		expect(screen.queryByTestId("pin-left")).not.toBeInTheDocument();
		expect(screen.getByTestId("pin-right")).toBeInTheDocument();
	});

	it("commit avec le suffixe du pin concerné", () => {
		const { onCommit } = setup({
			input: spec("PT", "input"),
			output: spec("ET", "output"),
		});

		fireEvent.click(screen.getByTestId("pin-left"));
		fireEvent.click(screen.getByTestId("pin-right"));

		expect(onCommit).toHaveBeenNthCalledWith(1, "PT", "next");
		expect(onCommit).toHaveBeenNthCalledWith(2, "ET", "next");
	});

	it("transmet le validateur et le mnémonique live de chaque pin", () => {
		const validator = jest.fn();
		setup(
			{ input: spec("PT", "input"), output: spec("ET", "output") },
			{
				getValidator: (suffix) => (suffix === "PT" ? validator : undefined),
				getLiveMnemonic: (suffix) => `T1.${suffix}`,
			},
		);

		const [inputProps, outputProps] = paramPinProps.mock.calls.map(
			([props]) => props,
		);
		expect(inputProps.validate).toBe(validator);
		expect(inputProps.liveMnemonic).toBe("T1.PT");
		expect(outputProps.validate).toBeUndefined();
		expect(outputProps.liveMnemonic).toBe("T1.ET");
	});

	it("n'exige ni validateur ni mnémonique live", () => {
		setup({ input: spec("PT", "input") });

		expect(paramPinProps.mock.calls[0][0].validate).toBeUndefined();
		expect(paramPinProps.mock.calls[0][0].liveMnemonic).toBeUndefined();
	});
});
