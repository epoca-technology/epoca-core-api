
// Class
export interface IBackgroundTask {
    // Properties
    // ...

    // Task Management
    get(): IBackgroundTaskInfo,
    start(): void,
    logProgress(currentProgress: number, description?: string): void,
    errored(error: any): void
}




// The possible task states 
export type IIBackgroundTaskState = "idle"|"running"|"errored"|"completed";



// The Background Task
export interface IBackgroundTaskInfo {
    // The name of the task
    name: string,

    // The state in which the task is
    state: IIBackgroundTaskState,

    // A brief description of the current state
    stateDescription: string,

    // The task's progress (0% - 100%)
    progress: number,

    // Event Dates
    running_ts?: number,
    errored_ts?: number,
    completed_ts?: number
}