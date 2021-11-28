import { ITendencyForecast } from "../../../types";

export interface ITrendService {

    forecast(numberSeries: number[]): any
}



export interface ITrendForecast {
    result: ITendencyForecast,
    lastMove: ITendencyForecast|undefined,
    lastStreak: ILastStreak,
    up: ITrendData,
    down: ITrendData,
}



export interface ILastStreak {
    count: number,
    tendency: ITendencyForecast,
}


export interface ITrendData {
    activeCount: number,
    avgCount: number,
    //highestCount: number,
    history: number[],
}

