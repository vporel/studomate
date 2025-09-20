import Grafcet from "./grafcet.schema"
import Variable from "./variable.schema"

export default class Project{
    appVersion: string = "0.1.0"
    creationDate: Date = new Date()
    lastModificationDate: Date = new Date()
    author?: string = ""
    variables: Variable[] = []
    grafcets: Record<string, Grafcet> = {}

}