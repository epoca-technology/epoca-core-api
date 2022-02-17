import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { IAuthModel } from "./interfaces";




@injectable()
export class AuthModel implements IAuthModel {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;



    constructor() {}





}