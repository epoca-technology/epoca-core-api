// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';


// Init the Notification Service
import { INotificationService } from "../../src/modules/notification";
const _notification: INotificationService = appContainer.get<INotificationService>(SYMBOLS.NotificationService);


// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');



describe('Notification Broadcasting: ',  function() {
    // Increase the timeout Interval
    beforeAll(() => { jasmine.DEFAULT_TIMEOUT_INTERVAL = 400000 });

    


    it('-Can send Telegram Messages thorugh the chat: ', async function() {
        //@ts-ignore
        await _notification.sendTelegram({
            sender: 'UNIT_TEST',
            title: 'Hello World!',
            description: 'Hey everyone, if you are receiving this message, it means the unit tests on the notification module have passed. This is the beginning of something amazing!'
        });
    });



});






