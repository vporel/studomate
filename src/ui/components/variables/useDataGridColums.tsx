"use client";

import useCanEdit from "../projects/useCanEdit";
import {
	getValidTypesForZones,
	VariableType,
	VariableZone,
} from "@/schemas/variable/variable.schema";
import {
	validateAddress,
	validateConstantValue,
	validateMnemonic,
} from "@/schemas/variable/variable.validator";
import { Dialect } from "@/expression-language/dialect.enum";
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
	const designing = useCanEdit();
	const simulating = useProjectStore(
		(state) => state.mode === ProjectMode.SIMULATION,
	);

	const dialect = useProjectStore((s) => s.project?.dialect ?? Dialect.FR);
	const isConstantsPage = zones.length === 1 && zones[0] === "constant";

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
					if (variablesManager.isMnemonicUsedByBlock(params.props.value))
						errors.push(tError("mnemonicUsedByBlock"));
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
			...(isConstantsPage
				? [
						{
							field: "declaredValue",
							headerName: t("declaredValue"),
							width: 160,
							hideable: false,
							editable: designing,
							preProcessEditCellProps: (params) => {
								const type = (params.otherFieldsProps?.type?.value ??
									params.row.type) as VariableType;
								const errors = validateConstantValue(
									"constant",
									type,
									params.props.value,
									dialect,
								).map((i) => tv(i.code as never, i.params as never));
								return {
									...params.props,
									error: errors.length > 0 ? errors[0] : false,
								};
							},
							renderEditCell: EditInputCell,
							valueParser: (value) => (value ? value.trim() : ""),
						} satisfies GridColDef,
					]
				: [
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
								const owner = variablesManager.getByAddress(params.props.value);
								if (owner && owner.id !== params.id)
									errors.push(
										tError("addressUsed", { mnemonic: owner.mnemonic }),
									);
								return {
									...params.props,
									error: errors.length > 0 ? errors[0] : false,
								};
							},
							renderEditCell: EditInputCell,
							valueParser: (value) => (value ? value.trim().toUpperCase() : ""),
						} satisfies GridColDef,
					]),
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
			isConstantsPage,
			dialect,
			designing,
			simulating,
			t,
			tError,
			tv,
		],
	);
}
