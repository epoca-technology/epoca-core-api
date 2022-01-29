import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IExternalRequestService } from "../external-request";
import { IForecastService, IForecast } from "./interfaces";




@injectable()
export class ForecastService implements IForecastService {
    // Inject dependencies
    @inject(SYMBOLS.ExternalRequestService)           private _req: IExternalRequestService;




    constructor() {}






    /**
     * Communicates with the RNN in order to retrieve a forecast. 
     * The end parameter can be used with past trading simulations. If none
     * is provided, it will use Date.now() as end.
     * @param end?
     * @returns Promise<IForecast>
     */
    public async forecast(end?: number): Promise<IForecast> {
        // Init the end
        end = typeof end == "number" ? end: Date.now();

        // Perform the request
        // @TODO

        // Return the results
        return { 
            position: Math.random() >= 0.5 ? 1: -1, 
            data: undefined 
        };
    }







}