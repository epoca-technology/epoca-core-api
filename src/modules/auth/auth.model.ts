import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import {getAuth, Auth, } from "firebase-admin/auth";
import { IAuthModel, IUserRecord } from "./interfaces";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";




@injectable()
export class AuthModel implements IAuthModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;

    // Auth Instance
    private readonly auth: Auth = getAuth();


    constructor() {}






    /* Retrievers */




    public async getFirebaseUser(uid: string): Promise<any> {
        return await this.auth.getUser('asd');
    }

}