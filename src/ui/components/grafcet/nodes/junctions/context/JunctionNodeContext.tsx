import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { createContext, ReactNode, useContext, useMemo } from "react";
import useBarsSelection from "./useBarsSelection";
import useBranchActions from "./useBranchActions";
import useBranchAddButtonsPositions from "./useBranchAddButtonsPositions";
import useContextMenuEventsHandler from "./useContextMenuEventsHandler";

type JunctionNodeContextType = {
	pivotSelected: boolean;
	selectedBranchId: string | null;
	selectPivot: () => void;
	selectBranch: (branchId: string) => void;
	selectPreviousBranch: () => void;
	selectNextBranch: () => void;
	clearSelection: () => void;
	branchAddButtonsPositions: number[];
	onBranchAdd: (buttonIndex: number) => void;
};

const JunctionNodeContext = createContext<JunctionNodeContextType>({
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
	children,
}: {
	id: string;
	data: JunctionData;
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
	} = useBarsSelection(data.branchesOrder);
	const { add: onBranchAdd } = useBranchActions(id, data);
	const branchAddButtonsPositions = useBranchAddButtonsPositions(data);

	useContextMenuEventsHandler(id, selectPivot, selectBranch);

	const contextValue = useMemo(
		() => ({
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

	return <JunctionNodeContext.Provider value={contextValue}>{children}</JunctionNodeContext.Provider>;
};

export const useJunctionNodeContext = () => useContext(JunctionNodeContext);
