"use client";

import routes from "@/app/routes";
import buildReportIssueMailto from "@/ui/lib/report-issue";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useHelpMenu(onShortcutsOpen: () => void): AppMenuType {
	return useMemo(
		() => ({
			id: "help",
			label: "Aide",
			items: [
				[
					{
						label: "Manuel utilisateur",
						onClick: () => {
							window.open(routes.userManual(), "_blank", "noopener,noreferrer");
						},
					},
					{
						label: "Raccourcis clavier",
						onClick: onShortcutsOpen,
					},
				],
				[
					{
						label: "Signaler un problème",
						onClick: () => {
							window.open(buildReportIssueMailto(), "_blank", "noopener,noreferrer");
						},
					},
				],
			],
		}),
		[onShortcutsOpen],
	);
}
