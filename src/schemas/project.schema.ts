import Page from "./page.schema"
import Variable from "./variable.schema"

export default class Project{
    appVersion: string = ""
    creationDate: Date = new Date()
    lastModificationDate: Date = new Date()
    author?: string = ""
    variables: Variable[] = []
    pages: Page[] = []
    pagesOrder: string[] = []
}