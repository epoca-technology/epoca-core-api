import { IServerNotifications } from "./interfaces";
import { INotificationSender } from "../notification";

// Init Sender
const sender: INotificationSender = "SERVER";

// Export the notifications
export const notifications: IServerNotifications = {
    fileSystemUsage: {
        sender: sender,
        title: 'High File System Usage!',
        description: 'The server has detected that the File System Usage exceeded the values established in the alarms configuration.'
    },
    memoryUsage: {
        sender: sender,
        title: 'High Memory Usage!',
        description: 'The server has detected that the Memory Usage exceeded the values established in the alarms configuration.'
    },
    cpuLoad: {
        sender: sender,
        title: 'High CPU Load!',
        description: 'The server has detected that the CPU Load exceeded the values established in the alarms configuration.'
    },
    cpuTemperature: {
        sender: sender,
        title: 'High CPU Temperature!',
        description: 'The server has detected that the CPU Temperature exceeded the values established in the alarms configuration.'
    },
    gpuLoad: {
        sender: sender,
        title: 'High GPU Load!',
        description: 'The server has detected that the GPU Load exceeded the values established in the alarms configuration.'
    },
    gpuTemperature: {
        sender: sender,
        title: 'High GPU Temperature!',
        description: 'The server has detected that the GPU Temperature exceeded the values established in the alarms configuration.'
    },
    gpuMemoryTemperature: {
        sender: sender,
        title: 'High GPU Memory Temperature!',
        description: 'The server has detected that the GPU Memory Temperature exceeded the values established in the alarms configuration.'
    }
}