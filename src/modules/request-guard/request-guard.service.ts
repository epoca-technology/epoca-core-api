import {injectable, inject} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IRequestGuardService } from "./interfaces";




@injectable()
export class RequestGuardService implements IRequestGuardService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;




    constructor() {}






    

}