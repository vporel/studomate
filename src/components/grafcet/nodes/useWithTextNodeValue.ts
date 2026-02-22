import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";

export default function useWithTextNodeValue(
	nodeId: string,
	data: any,
	valueProperty: string,
	transformToNumberBeforeSave: boolean = false,
): [
	value: string,
	setValue: Dispatch<SetStateAction<string>>,
	editing: boolean,
	setEditing: Dispatch<SetStateAction<boolean>>,
	saveValue: () => void,
] {
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const [value, setValue] = useState(data[valueProperty] + "");
	const [editing, setEditing] = useState(false);
	const saveValue = useCallback(() => {
		let valueToSave: any = value;
		if (transformToNumberBeforeSave) {
			valueToSave =
				value === "" || isNaN(parseInt(value)) || parseInt(value) < 0 ? "" : parseInt(value);
		}
		workflowManager.updateNodeData(nodeId, {
			[valueProperty]: valueToSave,
		});
	}, [value, workflowManager, nodeId, valueProperty, transformToNumberBeforeSave]);

	useEffect(() => {
		if (!editing) setValue(data[valueProperty] + "");
	}, [data, editing, valueProperty]);

	return [value, setValue, editing, setEditing, saveValue];
}
