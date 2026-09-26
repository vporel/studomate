"use client";

import {
	getValidTypesForZones,
	VariableZone,
} from "@/schemas/variable/variable.schema";
import {
	validateAddress,
	validateMnemonic,
} from "@/schemas/variable/variable.validator";
import { useT } from "@/ui/i18n/useT";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useProjectStore } from "../projects/ProjectContext";
import EditInputCell from "./EditInputCell";
import InputBehaviorCell from "./InputBehaviorCell";
import VariableValueCell from "./VariableValueCell";

export default function useGridColumns(zones: VariableZone[]): GridColDef[] {
	const t = useT("pages.variablesGrid.columns");
	const tError = useT("pages.variablesGrid.errors");
	const tv = useT("variableValidation");
	const variablesManager = useProjectStore((state) => state.variablesManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);
	const simulating = useProjectStore(
		(state) => state.mode === ProjectMode.SIMULATION,
	);

	const hasInputZone = zones.some(
		(zone) => zone === "logic-input" || zone === "analog-input",
	);

	return useMemo(
		(): GridColDef[] => [
			{
				field: "mnemonic",
				headerName: t("mnemonic"),
				width: 250,
				hideable: false,
				editable: designing,
				preProcessEditCellProps: (params) => {
					const errors = validateMnemonic(params.props.value).map((i) =>
						tv(i.code as never, i.params as never),
					);
					const existingVariableId = variablesManager.existsByMnemonic(
						params.props.value,
					);
					if (existingVariableId && existingVariableId !== params.id)
						errors.push(tError("mnemonicExists"));
					return {
						...params.props,
						error: errors.length > 0 ? errors[0] : false,
					};
				},
				renderEditCell: EditInputCell,
				valueParser: (value) => (value ? value.trim() : ""),
			},
			{
				field: "type",
				headerName: t("type"),
				width: 100,
				hideable: false,
				editable: designing,
				type: "singleSelect",
				valueOptions: getValidTypesForZones(zones).map((type) => ({
					value: type,
					label: type,
				})),
			},
			{
				field: "address",
				headerName: t("address"),
				width: 100,
				hideable: false,
				editable: designing,
				preProcessEditCellProps: (params) => {
					const errors = validateAddress(params.props.value).map((i) =>
						tv(i.code as never, i.params as never),
					);
					const existingVariableId = variablesManager.existsByAddress(
						params.props.value,
					);
					if (existingVariableId && existingVariableId !== params.id)
						errors.push(tError("addressExists"));
					return {
						...params.props,
						error: errors.length > 0 ? errors[0] : false,
					};
				},
				renderEditCell: EditInputCell,
				valueParser: (value) => (value ? value.trim().toUpperCase() : ""),
			},
			...(simulating
				? [
						{
							field: "value",
							headerName: t("value"),
							width: 110,
							hideable: false,
							editable: false,
							sortable: false,
							renderCell: (params) => (
								<VariableValueCell variableId={String(params.id)} />
							),
						} satisfies GridColDef,
					]
				: []),
			...(hasInputZone
				? [
						{
							field: "behavior",
							headerName: t("behavior"),
							width: 190,
							hideable: false,
							editable: false,
							sortable: false,
							renderCell: (params) => (
								<InputBehaviorCell
									variableId={String(params.id)}
									editable={designing}
								/>
							),
						} satisfies GridColDef,
					]
				: []),
			{
				field: "comment",
				headerName: t("comment"),
				flex: 1,
				hideable: false,
				editable: designing,
				renderEditCell: EditInputCell,
			},
		],
		[
			variablesManager,
			zones,
			hasInputZone,
			designing,
			simulating,
			t,
			tError,
			tv,
		],
	);
}
