import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { 
    IPositionValidations
} from "./interfaces";




@injectable()
export class PositionValidations implements IPositionValidations {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;





    constructor() {}








}
