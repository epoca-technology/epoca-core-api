import { IAuthority } from "../auth";



export interface IValidationsService {
    // UUID
    uuidValid(uuid: string): boolean,

    // Auth
    emailValid(email: string): boolean,
    passwordValid(password: string): boolean,
    authorityValid(authority: IAuthority, maxAuthority?: IAuthority): boolean,

    // Numbers
    numberValid(value: number, min?: number, max?: number): boolean,

}

