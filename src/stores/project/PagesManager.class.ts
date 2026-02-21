import { PageData, ProjectStoreGetFunction, ProjectStoreSetFunction } from "./project-store-types";

export default class PagesManager {
	private setProjectStore: ProjectStoreSetFunction;
	private getProjectStore: ProjectStoreGetFunction;

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setProjectStore = set;
		this.getProjectStore = get;
	}

	openPage(pageData: PageData): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		const pagesOrder = this.getProjectStore().pagesOrder;
		const pagesData = this.getProjectStore().pagesData;
		if (pagesOrder.includes(pageData.id)) {
			this.setProjectStore(() => ({ activePageId: pageData.id }));
			return;
		}
		const newPagesOrder = [...pagesOrder];
		newPagesOrder.push(pageData.id);
		const newPagesData = structuredClone(pagesData);
		newPagesData[pageData.id] = pageData;
		this.setProjectStore(() => ({ pagesData: newPagesData, pagesOrder: newPagesOrder }));
		this.setActivePage(pageData.id);
	}

	closePage(pageId: string): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		const pagesOrder = this.getProjectStore().pagesOrder;
		const pagesData = this.getProjectStore().pagesData;
		const activePageId = this.getProjectStore().activePageId;
		if (!pagesOrder.includes(pageId)) return;
		const newPagesData = structuredClone(pagesData);
		delete newPagesData[pageId];
		const newPagesOrder = pagesOrder.filter((id) => id !== pageId);
		//If the page was active, activate the previous page if the page is not the first one, otherwise the next one
		let newActivePageId = activePageId;
		if (newPagesOrder.length == 0) newActivePageId = null;
		else if (activePageId === pageId) {
			const indexInOld = pagesOrder.indexOf(pageId);
			if (indexInOld === 0) {
				newActivePageId = newPagesOrder[0];
			} else {
				newActivePageId = newPagesOrder[indexInOld - 1];
			}
		}
		this.setProjectStore(() => ({
			pagesOrder: newPagesOrder,
			pagesData: newPagesData,
			activePageId: newActivePageId,
		}));
	}

	setActivePage(pageId: string): void {
		const pagesOrder = this.getProjectStore().pagesOrder;
		if (!pagesOrder.includes(pageId)) throw new Error(`Page "${pageId}" not opened`);
		this.getProjectStore().setActiveScope(pageId);
		this.setProjectStore(() => ({ activePageId: pageId }));
	}
}
