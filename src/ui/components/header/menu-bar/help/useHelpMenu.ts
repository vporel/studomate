"use client";

import routes from "@/app/routes";
import { useT } from "@/ui/i18n/useT";
import { openReportIssue } from "@/ui/services/report-issue";
import { useMemo } from "react";
import useStartProductTour from "@/ui/components/product-tour/useStartProductTour";
import { AppMenuType } from "../app-menu-bar";

export default function useHelpMenu(onShortcutsOpen: () => void): AppMenuType {
	const t = useT("menu.help");
	const startProductTour = useStartProductTour();
	return useMemo(
		() => ({
			id: "help",
			label: t("title"),
			items: [
				[
					{
						label: t("userManual"),
						onClick: () => {
							window.open(routes.userManual(), "_blank", "noopener,noreferrer");
						},
					},
					{
						label: t("training"),
						onClick: () => {
							window.open(routes.training(), "_blank", "noopener,noreferrer");
						},
					},
					{
						label: t("keyboardShortcuts"),
						onClick: onShortcutsOpen,
					},
					{
						label: t("replayTour"),
						onClick: () => {
							void startProductTour();
						},
					},
				],
				[
					{
						label: t("reportIssue"),
						onClick: openReportIssue,
					},
				],
			],
		}),
		[onShortcutsOpen, startProductTour, t],
	);
}
