import { ITendencyForecast } from "../../types";




export interface ITrendForecast {
    forecast(numberSeries: number[]): ITrendForecastOutput
}




export interface ITrendForecastOutput {
    result: ITendencyForecast,
    lastTendency: ITendencyForecast|undefined,
    lastStreak?: ILastStreak,
    up: ITrendData,
    down: ITrendData,
}



export interface ILastStreak {
    count: number,
    tendency: ITendencyForecast,
}


export interface ITrendData {
    activeCount: number,
    totalCount: number,
    avgStreakCount: number,
    streakHistory: number[],
}