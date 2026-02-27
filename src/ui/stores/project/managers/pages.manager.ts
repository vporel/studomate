import { PageData, ProjectStoreGetFunction, ProjectStoreSetFunction } from "../project.store";

export default class PagesManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setStoreState = set;
		this.getStoreState = get;
	}

	openPage(pageData: PageData): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const pagesOrder = this.getStoreState().pagesOrder;
		const pagesData = this.getStoreState().pagesData;
		if (pagesOrder.includes(pageData.id)) {
			this.setStoreState(() => ({ activePageId: pageData.id }));
			return;
		}
		const newPagesOrder = [...pagesOrder];
		newPagesOrder.push(pageData.id);
		const newPagesData = structuredClone(pagesData);
		newPagesData[pageData.id] = pageData;
		this.setStoreState(() => ({ pagesData: newPagesData, pagesOrder: newPagesOrder }));
		this.setActivePage(pageData.id);
	}

	closePage(pageId: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const pagesOrder = this.getStoreState().pagesOrder;
		const pagesData = this.getStoreState().pagesData;
		const activePageId = this.getStoreState().activePageId;
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
		this.setStoreState(() => ({
			pagesOrder: newPagesOrder,
			pagesData: newPagesData,
			activePageId: newActivePageId,
		}));
	}

	setActivePage(pageId: string): void {
		const pagesOrder = this.getStoreState().pagesOrder;
		if (!pagesOrder.includes(pageId)) throw new Error(`Page "${pageId}" not opened`);
		this.getStoreState().setActiveScope(pageId);
		this.setStoreState(() => ({ activePageId: pageId }));
	}
}
