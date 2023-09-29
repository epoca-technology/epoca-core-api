import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IUtilitiesService } from "../../../utilities";
import { IVolumeModel } from "./interfaces";




@injectable()
export class VolumeModel implements IVolumeModel {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;



    constructor() {}





}