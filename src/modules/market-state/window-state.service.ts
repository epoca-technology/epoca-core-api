import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick } from "../candlestick";
import {
    IStateUtilitiesService,
    IWindowState,
    IWindowStateService,
} from "./interfaces";




@injectable()
export class WindowStateService implements IWindowStateService {
    // Inject dependencies
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;


    /**
     * Requirements
     * The percentage changes that must exist in the window in order for
     * it to have a state.
     */
    private readonly requirement: number = 0.1;
    private readonly strongRequirement: number = 0.75;




    constructor() { }








    /**
     * Calculates the state for the current window.
     * @param window 
     * @returns IWindowState
     */
    public calculateState(window: ICandlestick[]): IWindowState {
        const { averageState, splitStates } = this._stateUtils.calculateCurrentState(window, this.requirement, this.strongRequirement);
        return {
            s: averageState,
            ss: splitStates,
            w: window
        };
    }






    





    /**
     * Retrieves the module's default state.
     * @returns IWindowState
     */
    public getDefaultState(): IWindowState {
        return {
            s: 0,
            ss: {
                s100: {s: 0, c: 0},
                s75: {s: 0, c: 0},
                s50: {s: 0, c: 0},
                s25: {s: 0, c: 0},
                s15: {s: 0, c: 0},
                s10: {s: 0, c: 0},
                s5: {s: 0, c: 0},
                s2: {s: 0, c: 0},
            },
            w: []
        }
    }
}