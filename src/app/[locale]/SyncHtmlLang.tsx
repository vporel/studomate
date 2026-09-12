"use client";

import { useEffect } from "react";

/**
 * Aligne `<html lang>` sur la locale de la page. Le `<html>` est rendu par le layout racine
 * (partagé avec `/app`, hors segment `[locale]`) et ne peut donc pas connaître la locale au
 * rendu serveur — on la corrige au montage, pour les lecteurs d'écran.
 */
export default function SyncHtmlLang({ locale }: { locale: string }) {
	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);
	return null;
}
