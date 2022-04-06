import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
import { IAPIResponse, IUtilitiesService } from "../utilities";
import { IForecastService, IForecast } from "./interfaces";




@injectable()
export class ForecastService implements IForecastService {
    // Inject dependencies
    @inject(SYMBOLS.ExternalRequestService)           private _req: IExternalRequestService;
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;

    // HTTP options
    private options: IExternalRequestOptions = {
        host: 'forecast-api',
        path: '/',
        method: 'GET',
        port: 5000,
        headers: {
            'Content-Type': 'application/json',
            'secret-key': environment.FLASK_SECRET_KEY
        }
    }

    // Forecast Retriever
    private forecastInterval: any;
    private readonly intervalSeconds: number = 45 * 1000;
    private readonly secondsTolerance: number = 60;




    constructor() {}



    public async initialize(): Promise<void> {
        this.forecastInterval = setInterval(async () => {
            try {
                // Set the path
                this.options.path = '/';

                // Retrieve the chainlock status
                const response: IExternalRequestResponse = await this._req.request(this.options, {}, 'http');
                const apiResponse: IAPIResponse = response.data;

                // Validate the request data
                if (!apiResponse || typeof apiResponse != "object") {
                    console.log(response);
                    throw new Error(this._utils.buildApiError(`The Forecast API returned an invalid response.`, 0));
                }

                // Validate the response
                if (!apiResponse.success) throw new Error(apiResponse.error);

                console.log(`Forecast API: ${apiResponse.data}`);
            } catch (e) { 

            }
        }, this.intervalSeconds);
    }






    public stop(): void {
        if (this.forecastInterval) clearInterval(this.forecastInterval);
    }







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