import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { 
    IPositionModel,
} from "./interfaces";




@injectable()
export class PositionModel implements IPositionModel {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;





    constructor() {}








}
