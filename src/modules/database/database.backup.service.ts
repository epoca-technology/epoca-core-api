import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseBackupService, IDatabaseService } from "./interfaces";




@injectable()
export class DatabaseBackupService implements IDatabaseBackupService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)           private _db: IDatabaseService;




    constructor() {}










}