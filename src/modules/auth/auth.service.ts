import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { IAuthService } from "./interfaces";




@injectable()
export class AuthService implements IAuthService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;



    constructor() {}





}