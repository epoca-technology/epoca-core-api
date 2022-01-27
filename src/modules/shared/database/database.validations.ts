import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../../ioc";
import { IDatabaseValidations, IDatabaseService } from "./interfaces";




@injectable()
export class DatabaseValidations implements IDatabaseValidations {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)           private _db: IDatabaseService;




    constructor() {}










}