/** @jest-environment jsdom */
import Project, {
	DEFAULT_PROJECT_NAME,
} from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import { exportProject } from "./project-export-utils";

describe("exportProject", () => {
	let createObjectURL: jest.Mock;
	let revokeObjectURL: jest.Mock;
	let clickSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.useFakeTimers();
		createObjectURL = jest.fn(() => "blob:mock-url");
		revokeObjectURL = jest.fn();
		URL.createObjectURL = createObjectURL;
		URL.revokeObjectURL = revokeObjectURL;
		clickSpy = jest
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});
	});

	afterEach(() => {
		jest.useRealTimers();
		clickSpy.mockRestore();
	});

	it("does not revoke the object URL before the click has had a chance to start the download", () => {
		const project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");

		exportProject(project, "my-project");

		expect(clickSpy).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).not.toHaveBeenCalled();
	});

	it("revokes the object URL after a delay", () => {
		const project = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");

		exportProject(project, "my-project");
		jest.advanceTimersByTime(10_000);

		expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
	});
});
