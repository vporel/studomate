import type ProjectRepository from "@/persistence/repositories/project.repository";

const fail = (): never => {
	throw new Error(
		"The project repository is not available: this project store has no persistence",
	);
};

/** Stands in for the repository of a store without persistence: any use is a programming error. */
const UNAVAILABLE_REPOSITORY: ProjectRepository = {
	list: fail,
	get: fail,
	save: fail,
	delete: fail,
};

export default UNAVAILABLE_REPOSITORY;
