import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiSecretService } from "./interfaces";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";




@injectable()
export class ApiSecretService implements IApiSecretService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;



    constructor() {}







}