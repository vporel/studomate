import { ProjectMigration } from "./migration";

const v3ToV4: ProjectMigration = {
	from: 3,
	description:
		'Add the "constant" variable zone and its literal value field, and the optional 3D scene (`scene3d`) (no data to transform)',
	migrate: (project) => ({ ...project, schemaVersion: 4 }),
};

export default v3ToV4;
