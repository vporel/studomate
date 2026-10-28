"use client";

import { useEffect } from "react";

/**
 * Ajoute `<meta name="robots" content="noindex">` quand l'URL porte des paramètres (projet
 * partagé, projet restauré, page active...) : ces variantes de `/app` ne doivent pas être indexées.
 * Les liens `?template=…` des pages publiques reçoivent en plus `X-Robots-Tag: noindex` côté
 * serveur (`next.config.ts`).
 */
export default function NoIndexOnQuery() {
	useEffect(() => {
		if (!window.location.search) return;
		const meta = document.createElement("meta");
		meta.name = "robots";
		meta.content = "noindex";
		document.head.appendChild(meta);
		return () => meta.remove();
	}, []);

	return null;
}
