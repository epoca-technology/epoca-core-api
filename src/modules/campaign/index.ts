import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { CampaignService } from "./campaign.service";
import { CampaignValidations } from "./campaign.validations";
import { CampaignModel } from "./campaign.model";
import { 
    ICampaignService, 
    ICampaignValidations, 
    ICampaignModel,
} from "./interfaces";

export const campaignModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ICampaignService>(SYMBOLS.CampaignService).to(CampaignService);
    bind<ICampaignValidations>(SYMBOLS.CampaignValidations).to(CampaignValidations);
    bind<ICampaignModel>(SYMBOLS.CampaignModel).to(CampaignModel);
});

export * from './interfaces';