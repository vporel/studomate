import { format as dateFnsFormat, parseISO } from "date-fns";

export function parseDate(date: Date|string|number){
    return typeof date == "string" ? parseISO(date) : (typeof date == "number" ? new Date(date) : date)
}

export function formatDate(date: Date|string, format: string){
    if(date == undefined) return "undefined"
    return dateFnsFormat(parseDate(date), format)
}