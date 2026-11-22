/**
 * @jest-environment jsdom
 */
import TrainingProgressRepository from "@/persistence/repositories/training-progress.repository";
import TRAINING_MODULE_STEP_IDS from "@/training/module-step-ids";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import useTrainingResume from "./useTrainingResume";

jest.mock("@/persistence/repositories/training-progress.repository");
jest.mock("@/ui/stores/auth/auth.store");

const getLastProgress = jest.fn();
let authState: { user: { id: string } | null };

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

const { moduleId, stepIds } = TRAINING_MODULE_STEP_IDS[0];

beforeEach(() => {
	jest.clearAllMocks();
	authState = { user: null };
	(TrainingProgressRepository as jest.Mock).mockImplementation(() => ({
		getLastProgress,
	}));
	(useAuthStore as jest.Mock).mockImplementation((selector) =>
		selectorImplementation(authState)(selector),
	);
});

describe("useTrainingResume", () => {
	it("is null while loading then resolves the saved position", async () => {
		const pending = deferred<{ moduleId: string; stepId: string } | null>();
		getLastProgress.mockReturnValue(pending.promise);

		const { result } = renderHook(() => useTrainingResume());
		expect(result.current).toBeNull();

		await act(async () => {
			pending.resolve({ moduleId, stepId: stepIds[0] });
		});

		expect(getLastProgress).toHaveBeenCalledWith(TRAINING_MODULE_STEP_IDS);
		expect(result.current).toMatchObject({ moduleId, stepId: stepIds[0] });
	});

	it("stays null when nothing was started", async () => {
		getLastProgress.mockResolvedValue(null);
		const { result } = renderHook(() => useTrainingResume());
		await waitFor(() => expect(getLastProgress).toHaveBeenCalled());
		expect(result.current).toBeNull();
	});

	it("ignores a read that finishes after unmount", async () => {
		const pending = deferred<{ moduleId: string; stepId: string } | null>();
		getLastProgress.mockReturnValue(pending.promise);
		const { result, unmount } = renderHook(() => useTrainingResume());

		unmount();
		await act(async () => {
			pending.resolve({ moduleId, stepId: stepIds[0] });
		});

		expect(result.current).toBeNull();
	});

	it("ignores a stale read once the signed-in user changed", async () => {
		const first = deferred<{ moduleId: string; stepId: string } | null>();
		getLastProgress.mockReturnValueOnce(first.promise);
		const { result, rerender } = renderHook(() => useTrainingResume());

		getLastProgress.mockResolvedValueOnce(null);
		authState = { user: { id: "u2" } };
		rerender();
		await waitFor(() => expect(getLastProgress).toHaveBeenCalledTimes(2));

		await act(async () => {
			first.resolve({ moduleId, stepId: stepIds[0] });
		});

		expect(result.current).toBeNull();
	});

	it("reloads the progress when the signed-in user changes", async () => {
		getLastProgress.mockResolvedValueOnce(null);
		const { result, rerender } = renderHook(() => useTrainingResume());
		await waitFor(() => expect(getLastProgress).toHaveBeenCalledTimes(1));

		getLastProgress.mockResolvedValueOnce({ moduleId, stepId: stepIds[0] });
		authState = { user: { id: "u2" } };
		rerender();

		await waitFor(() => expect(result.current).not.toBeNull());
		expect(getLastProgress).toHaveBeenCalledTimes(2);
	});

	it("swallows a read failure, logs it and stays null", async () => {
		const error = jest.spyOn(console, "error").mockImplementation(() => {});
		getLastProgress.mockRejectedValue(new Error("offline"));

		const { result } = renderHook(() => useTrainingResume());

		await waitFor(() => expect(error).toHaveBeenCalled());
		expect(error).toHaveBeenCalledWith(
			"Failed to read training progress:",
			expect.any(Error),
		);
		expect(result.current).toBeNull();
		error.mockRestore();
	});
});
