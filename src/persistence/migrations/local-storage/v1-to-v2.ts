import { LayoutMigration } from "./layout-migration";

const APP_VERSION_KEY = "studomate_app_version";
const WHATS_NEW_VERSION_KEY = "studomate_whats_new_version";

/**
 * v1 → v2: `studomate_app_version` used to record the last "what's new" version seen. It now
 * records the application version, and `studomate_whats_new_version` takes over the former role.
 * Both are stamped with the values current when this layout shipped (frozen, not read from the
 * app constants), so a browser that has already seen that carousel is not shown it again.
 */
const v1ToV2: LayoutMigration = {
	from: 1,
	description:
		"Split studomate_app_version into app version and what's new version keys",
	migrate: () => {
		localStorage.setItem(WHATS_NEW_VERSION_KEY, "v1.7.1");
		localStorage.setItem(APP_VERSION_KEY, "v1.7.2");
	},
};

export default v1ToV2;
