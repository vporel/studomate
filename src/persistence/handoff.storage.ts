import { isLocale, type Locale } from "@/i18n/config";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import type { PagesSession } from "./pages-session.storage";
import { deserializeProject } from "./project-deserialization";
import { readJson, writeJson } from "./safe-local-storage";
import type { StorageWriteResult } from "./storage-write-error";

const STORAGE_KEY = "studomate_handoff";

type Handoff = {
	id: string;
	templateId: string | null;
	locale: Locale;
	pages: PagesSession;
	data: string; // JSON sérialisé du projet
};

/**
 * Project carried from a page of the site to the application, with the template it comes from
 * and the tabs that were open on it (ids the application resolves against the project).
 */
export type HandoffProject = {
	project: Project;
	templateId: string | null;
	locale: Locale;
	pages: PagesSession;
};

/**
 * Stores `project` for the application to open, replacing the previous one. Returns the token
 * that designates it in the URL, or null when the storage refused the write.
 */
export function saveHandoff({
	project,
	templateId,
	locale,
	pages,
}: HandoffProject): string | null {
	const id = createRandomId();
	const handoff: Handoff = {
		id,
		templateId,
		locale,
		pages,
		data: JSON.stringify(project),
	};
	const result: StorageWriteResult = writeJson(STORAGE_KEY, handoff);
	return result.ok ? id : null;
}

/**
 * The project stored under `id`, migrated to the current schema version. Null when the entry
 * was replaced by a later handoff, or cannot be read as a project.
 */
export function getHandoff(id: string): HandoffProject | null {
	const stored = readJson(STORAGE_KEY);
	if (typeof stored !== "object" || stored === null) return null;
	const {
		id: storedId,
		templateId,
		locale,
		pages,
		data,
	} = stored as Partial<Handoff>;
	if (storedId !== id || typeof data !== "string" || !isLocale(locale)) {
		return null;
	}
	let raw: unknown;
	try {
		raw = JSON.parse(data);
	} catch {
		return null;
	}
	if (typeof raw !== "object" || raw === null) return null;
	const result = deserializeProject(raw as Record<string, any>);
	if (!result.ok) return null;
	return {
		project: result.project,
		templateId: typeof templateId === "string" ? templateId : null,
		locale,
		pages: normalizePages(pages),
	};
}

function normalizePages(value: unknown): PagesSession {
	const candidate = (value ?? {}) as Partial<PagesSession>;
	return {
		pagesOrder: Array.isArray(candidate.pagesOrder)
			? candidate.pagesOrder.filter((id) => typeof id === "string")
			: [],
		activePageId:
			typeof candidate.activePageId === "string"
				? candidate.activePageId
				: null,
	};
}
