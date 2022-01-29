


export interface IValidationsService {

    // Numbers
    numberValid(value: number, min?: number, max?: number): boolean,

    // UUID
    uuidValid(uuid: string): boolean,
}

