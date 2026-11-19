"use client";

import routes from "@/app/routes";
import { useT } from "@/ui/i18n/useT";
import { openFeedbackFromMenu } from "@/ui/services/feedback-prompt";
import { whatsNewStore } from "@/ui/stores/whats-new/whats-new.store";
import { toLocale } from "@/i18n/config";
import { openReportIssue } from "@/ui/services/contact-page";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import useStartAppTour from "@/ui/components/product-tour/app-tour/useStartAppTour";
import { AppMenuType } from "../app-menu-bar";

export default function useHelpMenu(onShortcutsOpen: () => void): AppMenuType {
	const t = useT("menu.help");
	const startAppTour = useStartAppTour();
	const locale = toLocale(useLocale());
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
							void startAppTour();
						},
					},
					{
						label: t("whatsNew"),
						onClick: () => whatsNewStore.getState().open(),
					},
				],
				[
					{
						label: t("giveFeedback"),
						onClick: openFeedbackFromMenu,
					},
					{
						label: t("reportIssue"),
						onClick: () => openReportIssue(locale),
					},
				],
			],
		}),
		[onShortcutsOpen, startAppTour, t, locale],
	);
}
