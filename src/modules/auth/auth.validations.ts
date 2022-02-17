import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { IAuthValidations } from "./interfaces";




@injectable()
export class AuthValidations implements IAuthValidations {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;



    constructor() {}





}