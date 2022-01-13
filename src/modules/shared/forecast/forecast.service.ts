import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../../ioc";
import { IExternalRequestService } from "../external-request";
import { IForecastService, IForecast } from "./interfaces";




@injectable()
export class ForecastService implements IForecastService {
    // Inject dependencies
    @inject(SYMBOLS.ExternalRequestService)           private _req: IExternalRequestService;




    constructor() {}






    /**
     * Communicates with the RNN in order to retrieve a forecast for a 
     * given period of time.
     * @param start
     * @param end
     * @returns Promise<IForecast>
     */
    public async forecast(start: number, end: number): Promise<IForecast> {
        return { position: Math.random() >= 0.5 ? 1: -1, data: undefined };
    }







}