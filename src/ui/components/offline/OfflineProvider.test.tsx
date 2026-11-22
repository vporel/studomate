/**
 * @jest-environment jsdom
 */
import requestPersistentStorage from "@/offline/storage-persist";
import { SerwistProvider } from "@serwist/turbopack/react";
import { render, screen } from "@testing-library/react";
import OfflineProvider from "./OfflineProvider";

jest.mock("@/offline/storage-persist", () => ({
	__esModule: true,
	default: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@serwist/turbopack/react", () => ({
	SerwistProvider: jest.fn(({ children }) => <div>{children}</div>),
}));

const env = process.env as Record<string, string | undefined>;
const originalEnv = env.NODE_ENV;

afterEach(() => {
	env.NODE_ENV = originalEnv;
	jest.clearAllMocks();
});

describe("OfflineProvider", () => {
	it("renders its children and asks for persistent storage once", () => {
		render(
			<OfflineProvider>
				<span>contenu</span>
			</OfflineProvider>,
		);
		expect(screen.getByText("contenu")).toBeInTheDocument();
		expect(requestPersistentStorage).toHaveBeenCalledTimes(1);
	});

	it("registers the service worker at its fixed URL without navigation caching or reload", () => {
		env.NODE_ENV = "production";
		render(<OfflineProvider>x</OfflineProvider>);
		expect(SerwistProvider).toHaveBeenCalledWith(
			expect.objectContaining({
				swUrl: "/serwist/sw.js",
				disable: false,
				cacheOnNavigation: false,
				reloadOnOnline: false,
			}),
			undefined,
		);
	});

	it("disables the service worker in development", () => {
		env.NODE_ENV = "development";
		render(<OfflineProvider>x</OfflineProvider>);
		expect(SerwistProvider).toHaveBeenCalledWith(
			expect.objectContaining({ disable: true }),
			undefined,
		);
	});
});
