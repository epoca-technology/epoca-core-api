import {inject, injectable} from "inversify";
import { BehaviorSubject } from "rxjs";
import { environment, SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBackgroundTask, BackgroundTask, IBackgroundTaskInfo } from "../background-task";
import { IPredictionModelCertificate, IRegressionTrainingCertificate } from "../epoch-builder";
import { IUtilitiesService } from "../utilities";
import { 
    IPositionService,
    IActivePositions
} from "./interfaces";




@injectable()
export class PositionService implements IPositionService {
    // Inject dependencies
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;


    /**
     * Active Positions Stream
     * undefined: The module has not been initialized.
     * IActivePositions: The active positions object once the module is initialized.
     */
    public readonly active: BehaviorSubject<IActivePositions|null|undefined> = new BehaviorSubject(undefined);

    // Debug Mode
    private readonly debugMode: boolean = environment.debugMode;




    constructor() {}










    /***************
     * Initializer *
     ***************/




    /**
     * Initializes the position module as well as the active
     * positions.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        this.active.next(undefined);
    }











}
