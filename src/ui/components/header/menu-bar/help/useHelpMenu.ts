"use client";

import routes from "@/app/routes";
import { useT } from "@/ui/i18n/useT";
import buildReportIssueMailto from "@/ui/lib/report-issue";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useHelpMenu(onShortcutsOpen: () => void): AppMenuType {
	const t = useT("menu.help");
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
						label: t("keyboardShortcuts"),
						onClick: onShortcutsOpen,
					},
				],
				[
					{
						label: t("reportIssue"),
						onClick: () => {
							window.open(buildReportIssueMailto(), "_blank", "noopener,noreferrer");
						},
					},
				],
			],
		}),
		[onShortcutsOpen, t],
	);
}
