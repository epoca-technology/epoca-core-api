import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IUtilitiesService } from "../../../utilities";
import { IVolumeValidations } from "./interfaces";




@injectable()
export class VolumeValidations implements IVolumeValidations {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;



    constructor() {}





}