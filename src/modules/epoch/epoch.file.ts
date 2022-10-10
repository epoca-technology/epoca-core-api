import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IEpochFile, IUnpackedEpochFile } from "./interfaces";




@injectable()
export class EpochFile implements IEpochFile {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;



    constructor() {}




    


    public async downloadAndUnpackEpochFile(epochID: string): Promise<IUnpackedEpochFile> {
        return <IUnpackedEpochFile>{};
    }
}