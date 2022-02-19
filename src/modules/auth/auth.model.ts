import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import {getAuth, Auth, } from "firebase-admin/auth";
import { IAuthModel, IUserRecord } from "./interfaces";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { authenticator } from 'otplib';



@injectable()
export class AuthModel implements IAuthModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;

    // Auth Instance
    private readonly auth: Auth = getAuth();


    constructor() {
        // Set the authenticator options
        authenticator.options = { 
            window: 2,
            step: 30
        };
    }






    /* Retrievers */




    public async getFirebaseUser(uid: string): Promise<any> {
        return await this.auth.getUser('asd');
    }












}