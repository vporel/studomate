import { ProjectMigration } from "./migration";

const v3ToV4: ProjectMigration = {
	from: 3,
	description:
		'Add the "constant" variable zone and its literal value field (no data to transform)',
	migrate: (project) => ({ ...project, schemaVersion: 4 }),
};

export default v3ToV4;
