import {appContainer} from "../../../ioc";
import { ICandlestickSeries, SYMBOLS } from "../../../types";
import { ITendencyForecast, ITendencyForecastExtended, IForecastProviderResult } from "../interfaces";
import { ITulip, ITulipConfig, IPeriodData } from "./interfaces";
import * as tulind from "tulind";
import {BigNumber} from "bignumber.js";

// Init Utilities Service
import { IUtilitiesService } from "../../../modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);




export class Tulip implements ITulip {
    // Series
    protected series1: IPeriodData;



    
    constructor(series: ICandlestickSeries, config: ITulipConfig) {
        // Init the series
        this.series1 = this.getSeriesForPeriod(series);
        console.log(this.series1.close);

    }
    



    public async forecast(): Promise<IForecastProviderResult> {
        //console.log(tulind.indicators);
        const sma = await tulind.indicators.sma.indicator([this.series1.close], [3]);
        //console.log(sma);

        const stoch = await tulind.indicators.stoch.indicator([this.series1.high, this.series1.low, this.series1.close], [5, 3, 3]);
        //console.log(stoch);

        const close: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const rsi = await tulind.indicators.rsi.indicator([close], [5]);
        const cleanRSI = [0,0,0,0,0,...rsi[0]];
        for (let i = 0; i < this.series1.close.length; i++) {
            console.log(`${this.series1.close[i]} - ${cleanRSI[i]}`);
        }
        //console.log(rsi);

        return {result: 1};
    }








    private getSeriesForPeriod(series: ICandlestickSeries): IPeriodData {
        let period: IPeriodData = {
            open: [],
            high: [],
            low: [],
            close: [],
            volume: []
        }
        for (let item of series) {
            period.open.push(Number(item[1]));
            period.high.push(Number(item[2]));
            period.low.push(Number(item[3]));
            period.close.push(Number(item[4]));
            period.volume.push(Number(item[5]));
        }
        return period;
    }

    
}