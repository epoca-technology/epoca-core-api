// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';


// Init the Notification Service
import { INotificationService } from "../../src/modules/notification";
const _notification: INotificationService = appContainer.get<INotificationService>(SYMBOLS.NotificationService);






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






