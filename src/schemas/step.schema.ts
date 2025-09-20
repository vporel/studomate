import Action from "./action.schema"
import GrafcetElement, { GrafcetElementDimensions, GrafcetElementPosition } from "./grafcet-element.schema"

export default class Step extends GrafcetElement{
    id: string = ""
    number: number|"" = 0

    constructor(id: string, number: number|"", position: GrafcetElementPosition, dimensions: GrafcetElementDimensions){
        super(position, dimensions)
        this.id = id
        this.number = number
    }

    /**
     * 
     * @returns null if there is no error
     */
    validate(): string[]|null{

        return null
    }
}