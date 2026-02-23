import { useProjectContext } from "@/components/projects/ProjectContext";
import GrafcetElementsValidator from "@/schemas/grafcet/validators/GrafcetElementsValidator.class";
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";

export default function useWithTextNodeValue(
	nodeId: string,
	data: any,
	valueProperty: string,
	transformToNumberBeforeSave: boolean = false,
): [
	value: string,
	setValue: (newValue: string) => void,
	editing: boolean,
	setEditing: Dispatch<SetStateAction<boolean>>,
	saveValue: () => void,
	error: string | false,
] {
	const { store } = useGrafcetContext();
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const [value, _setValue] = useState(data[valueProperty] + "");
	const [editing, setEditing] = useState(false);
	const [error, setError] = useState<string | false>(false);
	const projectStore = useProjectContext();
	const transformValue = useCallback(
		(v: string) => {
			let transformedValue: any = v;
			if (transformToNumberBeforeSave) {
				transformedValue = v === "" || isNaN(parseInt(v)) || parseInt(v) < 0 ? "" : parseInt(v);
			}
			return transformedValue;
		},
		[transformToNumberBeforeSave],
	);
	const saveValue = useCallback(() => {
		workflowManager.updateNodeData(
			nodeId,
			{
				[valueProperty]: transformValue(value),
			},
			projectStore!.getState().project!,
		);
	}, [value, workflowManager, nodeId, valueProperty, transformValue, projectStore]);

	useEffect(() => {
		if (!editing) {
			_setValue(data[valueProperty] + "");
			setError(false);
		}
	}, [data, editing, valueProperty]);

	const setValue = useCallback(
		(newValue: string) => {
			_setValue(newValue);
			//Check errors
			const transformedValue = transformValue(newValue);
			const errors = GrafcetElementsValidator.validateNewData(
				nodeId,
				{ [valueProperty]: transformedValue },
				store!.getState().grafcet!,
				{
					projectData: { variables: projectStore!.getState().project!.variables },
				},
			);
			setError(errors.length > 0 ? errors[0] : false);
		},
		[transformValue, nodeId, valueProperty, store, projectStore],
	);

	return [value, setValue, editing, setEditing, saveValue, error];
}
