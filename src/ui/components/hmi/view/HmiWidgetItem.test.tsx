/** @jest-environment jsdom */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { fireEvent, render } from "@testing-library/react";
import { HMI_WIDGET_ZINDEX_OFFSET } from "@/ui/components/hmi/logic/constants";
import HmiWidgetItem from "./HmiWidgetItem";
import useDrivenInputVariable from "./useDrivenInputVariable";
import {
	useHmiPositionAnimationOffset,
	useHmiSimulationValue,
} from "./use-hmi-widget-simulation";

const mockComponent = jest.fn();

jest.mock("@/ui/components/hmi/widgets/hmi-widget-ui", () => ({
	HMI_WIDGET_UI: new Proxy(
		{},
		{
			get: () => ({
				component: (props: unknown) => {
					mockComponent(props);
					return <div data-testid="inner" />;
				},
			}),
		},
	),
}));
jest.mock("./useBoundInputBehavior", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./useDrivenInputVariable");
jest.mock("./use-hmi-widget-simulation");

const widget = (data: object = { variable: "m1" }) =>
	({
		id: "w1",
		type: "push-button",
		position: { x: 100, y: 50 },
		size: { width: 80, height: 40 },
		stackOrder: 3,
		data,
	}) as unknown as HmiWidget;

const handlers = () => ({
	onSetVariableValue: jest.fn(),
	onTriggerEvent: jest.fn(),
	onDragStart: jest.fn(),
	onResizeStart: jest.fn(),
	onContextMenu: jest.fn(),
});

type Props = Partial<React.ComponentProps<typeof HmiWidgetItem>>;

const setup = (props: Props = {}) => {
	const h = handlers();
	const utils = render(
		<HmiWidgetItem
			widget={widget()}
			isSelected={false}
			isSimulation={false}
			showResizeHandle={false}
			{...h}
			{...props}
		/>,
	);
	const wrapper = utils.container.firstElementChild as HTMLElement;
	return { ...utils, wrapper, ...h };
};

const css = (el: HTMLElement) => getComputedStyle(el);

const lastProps = () => mockComponent.mock.calls.at(-1)![0];

beforeEach(() => {
	mockComponent.mockClear();
	(useDrivenInputVariable as jest.Mock).mockReturnValue(false);
	(useHmiSimulationValue as jest.Mock).mockReturnValue(undefined);
	(useHmiPositionAnimationOffset as jest.Mock).mockReturnValue(undefined);
});

describe("HmiWidgetItem", () => {
	describe("geometry", () => {
		it("places the wrapper from the widget position, size and stack order", () => {
			const { wrapper } = setup();

			expect(css(wrapper).left).toBe("100px");
			expect(css(wrapper).top).toBe("50px");
			expect(css(wrapper).width).toBe("80px");
			expect(css(wrapper).height).toBe("40px");
			expect(css(wrapper).zIndex).toBe(String(3 + HMI_WIDGET_ZINDEX_OFFSET));
		});

		it("applies the drag preview offset to the position", () => {
			const { wrapper } = setup({ previewOffset: { dx: 10, dy: -5 } });

			expect(css(wrapper).left).toBe("110px");
			expect(css(wrapper).top).toBe("45px");
		});

		it("adds the position animation offset on top of the drag offset", () => {
			(useHmiPositionAnimationOffset as jest.Mock).mockReturnValue({
				dx: 7,
				dy: 3,
			});
			const { wrapper } = setup({ previewOffset: { dx: 10, dy: 10 } });

			expect(css(wrapper).left).toBe("117px");
			expect(css(wrapper).top).toBe("63px");
		});

		it("lets the resize preview position and size override everything else", () => {
			const { wrapper } = setup({
				previewOffset: { dx: 10, dy: 10 },
				previewPosition: { x: 5, y: 6 },
				previewSize: { width: 20, height: 30 },
			});

			expect(css(wrapper).left).toBe("5px");
			expect(css(wrapper).top).toBe("6px");
			expect(css(wrapper).width).toBe("20px");
			expect(css(wrapper).height).toBe("30px");
		});
	});

	describe("selection and handles", () => {
		it("outlines a selected widget in design mode and passes selected", () => {
			const { wrapper } = setup({ isSelected: true });

			expect(css(wrapper).outline).toContain("dashed");
			expect(lastProps().selected).toBe(true);
		});

		it("shows no outline nor selected state in simulation", () => {
			const { wrapper } = setup({ isSelected: true, isSimulation: true });

			expect(css(wrapper).outline).not.toContain("dashed");
			expect(lastProps().selected).toBe(false);
		});

		it("renders the eight resize handles only when requested outside simulation", () => {
			const shown = setup({ showResizeHandle: true });
			expect(shown.wrapper.children).toHaveLength(1 + 8);
			shown.unmount();

			const hidden = setup({ showResizeHandle: false });
			expect(hidden.wrapper.children).toHaveLength(1);
			hidden.unmount();

			const simulated = setup({ showResizeHandle: true, isSimulation: true });
			expect(simulated.wrapper.children).toHaveLength(1);
		});

		it("reports the direction of the pressed handle", () => {
			const { wrapper, onResizeStart } = setup({ showResizeHandle: true });

			fireEvent.mouseDown(wrapper.children[1]);

			expect(onResizeStart).toHaveBeenCalledWith(expect.anything(), "nw", "w1");
		});

		it("uses a grab cursor only when editable", () => {
			expect(css(setup().wrapper).cursor).toBe("grab");
			expect(css(setup({ editable: false }).wrapper).cursor).toBe("default");
			expect(css(setup({ isSimulation: true }).wrapper).cursor).toBe("default");
		});
	});

	describe("events", () => {
		it("forwards mouse down and context menu with the widget id", () => {
			const { wrapper, onDragStart, onContextMenu } = setup();

			fireEvent.mouseDown(wrapper);
			fireEvent.contextMenu(wrapper);

			expect(onDragStart).toHaveBeenCalledWith(expect.anything(), "w1");
			expect(onContextMenu).toHaveBeenCalledWith(expect.anything(), "w1");
		});

		it("stops click propagation", () => {
			const parentClick = jest.fn();
			const { wrapper } = setup();
			document.body.addEventListener("click", parentClick);

			fireEvent.click(wrapper);

			expect(parentClick).not.toHaveBeenCalled();
		});
	});

	describe("simulation wiring", () => {
		it("gives a value writer and trigger in simulation", () => {
			const { onSetVariableValue, onTriggerEvent } = setup({
				isSimulation: true,
			});

			lastProps().onValueChange(true);
			lastProps().onTrigger("onPress");

			expect(onSetVariableValue).toHaveBeenCalledWith("m1", true);
			expect(onTriggerEvent).toHaveBeenCalledWith("w1", "onPress");
			expect(lastProps().animationsEnabled).toBe(true);
		});

		it("gives no onValueChange when the bound input is driven", () => {
			(useDrivenInputVariable as jest.Mock).mockReturnValue(true);
			setup({ isSimulation: true });

			expect(lastProps().onValueChange).toBeUndefined();
			expect(lastProps().onTrigger).toBeDefined();
		});

		it("gives no onValueChange for a widget without a bound variable", () => {
			setup({ isSimulation: true, widget: widget({}) });

			expect(lastProps().onValueChange).toBeUndefined();
		});

		it("gives neither callback outside simulation", () => {
			setup();

			expect(lastProps().onValueChange).toBeUndefined();
			expect(lastProps().onTrigger).toBeUndefined();
			expect(lastProps().animationsEnabled).toBe(false);
		});

		it("normalizes the simulated value to a boolean or a number", () => {
			(useHmiSimulationValue as jest.Mock).mockReturnValue(1);
			setup({ isSimulation: true });
			expect(lastProps().value).toBe(1);

			(useHmiSimulationValue as jest.Mock).mockReturnValue(false);
			setup({ isSimulation: true });
			expect(lastProps().value).toBe(false);
		});

		it("reads the simulation value only in simulation", () => {
			setup();
			expect(useHmiSimulationValue).toHaveBeenLastCalledWith(undefined);

			setup({ isSimulation: true });
			expect(useHmiSimulationValue).toHaveBeenLastCalledWith("m1");
		});
	});
});
