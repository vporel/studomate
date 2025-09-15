import Grafcet from "./grafcet.schema"

export type PageFormat = {
    type: "A4"|"A3",
    orientation: "portrait"|"landscape"
}

export default class Page{
    id: string = ""
    format: PageFormat = {type: "A4", orientation: "portrait"}
    grafcet: Grafcet|null = null
}