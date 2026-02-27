import ElementAnalyserFactory from "@/project-analyser/analysers/grafcet/element-analyser.factory";
import { ElementType } from "@/schemas/grafcet/element.schema";
import { useProjectContext } from "@/ui/components/projects/ProjectContext";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";

export default function useWithTextNodeValue(
	nodeId: string,
	nodeType: ElementType,
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
	const analyser = useMemo(() => ElementAnalyserFactory.getAnalyserForType(nodeType), [nodeType]);
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
		workflowManager.updateNodeData(nodeId, {
			[valueProperty]: transformValue(value),
		});
	}, [value, workflowManager, nodeId, valueProperty, transformValue]);

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
			const grafcet = store!.getState().grafcet!;
			const elementCopy = grafcet.getElementById(nodeId)!.copy();
			elementCopy.updateData({ [valueProperty]: transformedValue });
			const issues = analyser.analyseIsolated(elementCopy, { allowEmptyContent: true });
			const errors = issues.filter((issue) => issue.severity === "error");
			setError(errors.length > 0 ? errors[0].message : false);
		},
		[transformValue, nodeId, valueProperty, store, analyser],
	);

	return [value, setValue, editing, setEditing, saveValue, error];
}
