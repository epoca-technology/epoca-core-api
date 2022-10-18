import getDecorators from "inversify-inject-decorators";
import { Container } from "inversify";
import {SYMBOLS} from "../../ioc";
import * as moment from "moment";
import { IUtilitiesService } from "../utilities";
import { UtilitiesService } from "../utilities/utilities.service";
import { IBackgroundTask, IBackgroundTaskInfo } from "./interfaces";


/**
 * Inversify Container
 * When a traditional class is first introduced, the container exported from the
 * ioc is undefined and therefore, crashes the API.
 * In order to fix this issue, a mini container is created and the dependencies
 * are injected lazyly.
 */
const container: Container = new Container();
container.bind<IUtilitiesService>(SYMBOLS.UtilitiesService).to(UtilitiesService)
const { lazyInject } = getDecorators(container);



// Class
export class BackgroundTask implements IBackgroundTask {
    // Inject the utilities service
    @lazyInject(SYMBOLS.UtilitiesService)
    private _utils: IUtilitiesService;

    // Task Information
    private task: IBackgroundTaskInfo;


    constructor(taskName: string) {
        this.task = this.getIdleTask(taskName);
    }





    /**
     * Retrieves the task info. If the task has been completed
     * for over 2 minutes, it will set it on idle state.
     * @returns IBackgroundTaskInfo
     */
    public getTask(): IBackgroundTaskInfo {
        // check if the task has been completed
        if (this.task.state == "completed") {
            // Calculate the time in which it should be set back to idle
            const idleTime: number = moment(this.task.completed_ts).add(2, "minutes").valueOf();

            // If the current time is equals or greater, set the task to idle and return it
            if (Date.now() >= idleTime) {
                this.task = this.getIdleTask(this.task.name);
                return this.task;
            } 
            
            // Otherwise, return the task as is
            else {
                return this.task;
            }
        } 
        
        // Otherwise, return it as is
        else {
            return this.task;
        }
    }







    /**
     * Starts a new task as long as there isn"t another one running.
     */
    public start(): void {
        // Make sure there isn"t another task running
        if (this.task.state == "running") {
            throw new Error(this._utils.buildApiError(`The task ${this.task.name} cannot be started because it is already running.`, 14000))
        }

        // Start the new task
        this.task = {
            name: this.task.name,
            state: "running",
            stateDescription: "Running...",
            progress: 0,
            running_ts: Date.now()
        }
    }






    /**
     * Logs the current progress of the task. An optional description can be provided.
     * This function must be invoked with a currentProgress of 100 in order for the 
     * task to be marked as completed.
     * @param currentProgress 
     * @param description?
     */
    public logProgress(currentProgress: number, description?: string): void {
        // Make sure there is a task running
        if (this.task.state != "running") {
            throw new Error(this._utils.buildApiError(`The task ${this.task.name} progress cannot be updated because there isnt a task running.`, 14001))
        }

        // The progress must be a number ranging 0 - 100
        if (currentProgress < 0 || currentProgress > 100) {
            throw new Error(this._utils.buildApiError(`The task ${this.task.name} progress cannot be updated because an invalid value was provided (${currentProgress}).`, 14002))
        }

        // If the task has not been completed, just update the progress
        if (currentProgress < 100) {
            this.task.progress = currentProgress;
            this.task.stateDescription = description || "N/A";
        } 
        
        // Otherwise, complete the task
        else {
            this.task.state = "completed";
            this.task.stateDescription = "Task completed successfully.";
            this.task.progress = 100;
            this.task.completed_ts = Date.now();
        }
    }






    /**
     * Marks the task as errored and sets the message on the stateDescription for 
     * debugging purposes.
     * @param error 
     */
    public errored(error: any): void {
        // Make sure there is a task running
        if (this.task.state != "running") {
            throw new Error(this._utils.buildApiError(`The task ${this.task.name} cannot be marked as errored because there isnt a task running.`, 14002))
        }

        // Update the task details
        this.task.state = "errored";
        this.task.stateDescription = this._utils.getErrorMessage(error);
        this.task.progress = 0;
        this.task.errored_ts = Date.now();
    }










    /* Misc Helpers */






    /**
     * Returns a task in idle state.
     * @param taskName
     * @returns IBackgroundTaskInfo
     */
    private getIdleTask(taskName: string): IBackgroundTaskInfo {
        return {
            name: taskName,
            state: "idle",
            stateDescription: "Ready to run the task.",
            progress: 0
        }
    }
}