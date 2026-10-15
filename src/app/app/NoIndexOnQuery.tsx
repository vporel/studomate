"use client";

import { useEffect } from "react";

/**
 * Ajoute `<meta name="robots" content="noindex">` quand l'URL porte des paramètres (projet
 * partagé, projet restauré, modèle...) : ces variantes de `/app` ne doivent pas être indexées.
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
