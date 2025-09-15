
export type VariableZone = "logic-input"|"logic-output"|"analog-input"|"analog-output"|"memory"
export type VariableType = "bool"|"int"|"long"|"word"|"dword"|"real"|"string"|"TON"|"TOFF"|"TP"

export default class Variable{
    id: string = ""
    mnemonic: string = ""
    zone: VariableZone = "logic-input"
    type: VariableType = "bool"
    address?: string
    comment?: string
    
    /**
     * 
     * @returns null if there is no error
     */
    validate(): string[]|null{
        const errors: string[] = []
        /*
            Mnemonic
            - starts with a letter
            - has a maximum of 32 characters
            - contains only letters and numbers
            - no special characters except '_'
        */
        const mnemonicRegex = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/
        if(!this.mnemonic.match(mnemonicRegex)) errors.push("Mnémonique invalide")

        /*
            zone, type
        */
        //The types are enough to validate these variables
        
        /*
            Address
            Form : %{zone-letter}{number} or %{zone-letter}{number}.{number}
        */
        if(this.address && this.address != ""){
            const addressRegex = /^%(E|I|Q|O|EA|IW|SA|QW|M|MW|MF|MD|T)[0-9]{1, 5}(\.[0-9]){0, 5}$/
            if(!this.address.match(addressRegex)) errors.push("L'adresse est invalide")
        }
        return errors.length == 0 ? null : errors
    }
}