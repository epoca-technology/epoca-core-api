import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { ICampaignValidations } from "./interfaces";




@injectable()
export class CampaignValidations implements ICampaignValidations {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;








    constructor() {}










}
