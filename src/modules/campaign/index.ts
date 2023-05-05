import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { CampaignService } from "./campaign.service";
import { CampaignValidations } from "./campaign.validations";
import { CampaignModel } from "./campaign.model";
import { CampaignUtilities } from "./campaign.utilities";
import { 
    ICampaignService, 
    ICampaignValidations, 
    ICampaignModel,
    ICampaignUtilities
} from "./interfaces";

export const campaignModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ICampaignService>(SYMBOLS.CampaignService).to(CampaignService);
    bind<ICampaignValidations>(SYMBOLS.CampaignValidations).to(CampaignValidations);
    bind<ICampaignModel>(SYMBOLS.CampaignModel).to(CampaignModel);
    bind<ICampaignUtilities>(SYMBOLS.CampaignUtilities).to(CampaignUtilities);
});

export * from './interfaces';