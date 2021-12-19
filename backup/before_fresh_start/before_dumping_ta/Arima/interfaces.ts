import { IVerbose } from "../../../types";
import { IForecastProvider } from "../interfaces";




// Class
export interface IArima extends IForecastProvider {}

// Config
export interface IArimaConfig {
    verbose?: IVerbose
}

// Result Data
export interface IArimaResultData {
    superCool?: string
}