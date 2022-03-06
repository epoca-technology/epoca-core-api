import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import {execute} from "@getvim/execute";
import { IDatabaseBackupService, IDatabaseService } from "./interfaces";




@injectable()
export class DatabaseBackupService implements IDatabaseBackupService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)           private _db: IDatabaseService;




    constructor() {}










    public async backupDatabase(): Promise<void> {
        await execute(`docker exec postgres docker-entrypoint.sh pg_dump -U ${this._db.config.user} -h ${this._db.config.host} -d ${this._db.config.database} -f ./db_backups/backup.dump -Fc`);
    }




}