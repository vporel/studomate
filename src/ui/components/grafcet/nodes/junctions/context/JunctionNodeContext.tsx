import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { createContext, ReactNode, useContext, useMemo } from "react";
import useBarsSelection from "./useBarsSelection";
import useBranchActions from "./useBranchActions";
import useBranchAddButtonsPositions, {
	BranchAddButton,
} from "./useBranchAddButtonsPositions";
import useContextMenuEventsHandler from "./useContextMenuEventsHandler";

type JunctionNodeContextType = {
	nodeId: string;
	width: number;
	data: JunctionData;
	pivotSelected: boolean;
	selectedBranchId: string | null;
	selectPivot: () => void;
	selectBranch: (branchId: string) => void;
	selectPreviousBranch: () => void;
	selectNextBranch: () => void;
	clearSelection: () => void;
	branchAddButtonsPositions: BranchAddButton[];
	onBranchAdd: (insertIndex: number) => void;
};

const JunctionNodeContext = createContext<JunctionNodeContextType>({
	nodeId: "",
	width: 0,
	data: { pivotPosition: 0, branches: {}, branchesOrder: [] },
	pivotSelected: false,
	selectedBranchId: null,
	selectPivot: () => {},
	selectBranch: () => {},
	selectPreviousBranch: () => {},
	selectNextBranch: () => {},
	clearSelection: () => {},
	branchAddButtonsPositions: [],
	onBranchAdd: () => {},
});

export const JunctionNodeContextProvider = ({
	id,
	data,
	width,
	children,
}: {
	id: string;
	data: JunctionData;
	width: number;
	children: ReactNode;
}) => {
	const {
		pivotSelected,
		selectedBranchId,
		selectPivot,
		selectBranch,
		selectPreviousBranch,
		selectNextBranch,
		clearSelection,
	} = useBarsSelection(id, data.branchesOrder);
	const { add: onBranchAdd } = useBranchActions(id);
	const branchAddButtonsPositions = useBranchAddButtonsPositions(data, width);

	useContextMenuEventsHandler(id, selectPivot, selectBranch);

	const contextValue = useMemo(
		() => ({
			nodeId: id,
			width,
			data,
			pivotSelected,
			selectedBranchId,
			selectPivot,
			selectBranch,
			selectPreviousBranch,
			selectNextBranch,
			clearSelection,
			branchAddButtonsPositions,
			onBranchAdd,
		}),
		[
			id,
			width,
			data,
			selectBranch,
			selectPivot,
			selectPreviousBranch,
			selectNextBranch,
			clearSelection,
			pivotSelected,
			selectedBranchId,
			branchAddButtonsPositions,
			onBranchAdd,
		],
	);

	return (
		<JunctionNodeContext.Provider value={contextValue}>
			{children}
		</JunctionNodeContext.Provider>
	);
};

export const useJunctionNodeContext = () => useContext(JunctionNodeContext);
