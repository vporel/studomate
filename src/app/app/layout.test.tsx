import { metadata as sceneMetadata } from "./3d-scene/layout";
import AppLayout, { metadata } from "./layout";

jest.mock("@/ui/components/MobileGuard", () => ({
	__esModule: true,
	default: ({ children }: { children: unknown }) => children,
}));

jest.mock("@/app/RootDocument", () => ({
	__esModule: true,
	default: () => null,
}));

describe("métadonnées de /app", () => {
	it("a un titre, une description et un canonical propres, sans hériter de l'URL de l'accueil", () => {
		expect(metadata.title).toContain("Studomate");
		expect(metadata.description).toBeTruthy();
		expect(metadata.alternates?.canonical).toBe("/app");
		expect((metadata.openGraph as { url: string }).url).toBe("/app");
		expect((metadata.twitter as { title: string }).title).toBe(metadata.title);
		expect(metadata.robots).toBeUndefined();
	});

	it("la scène 3D n'est pas indexée", () => {
		expect(sceneMetadata.robots).toEqual({ index: false, follow: false });
	});
});

describe("AppLayout", () => {
	it("déclare lang=fr dans le HTML serveur", () => {
		expect(AppLayout({ children: null }).props.lang).toBe("fr");
	});
});
