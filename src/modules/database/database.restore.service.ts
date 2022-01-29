import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseRestoreService, IDatabaseService } from "./interfaces";




@injectable()
export class DatabaseRestoreService implements IDatabaseRestoreService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)           private _db: IDatabaseService;




    constructor() {}










}