// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';


// Init service
import { IUtilitiesService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// IP Blacklist
import { IIPBlacklistService, IIPBlacklistModel, IIPBlacklistRecord } from "../../src/modules/ip-blacklist";
const _service = appContainer.get<IIPBlacklistService>(SYMBOLS.IPBlacklistService);
const _model = appContainer.get<IIPBlacklistModel>(SYMBOLS.IPBlacklistModel);


// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');


// Test IPs
const ips: string[] = [
    '192.168.1.5',
    'ffff:192.168.1.5'
];




describe('IP Blacklist:', function() {
    // Clean the DB and the local object before and after tests
    beforeEach(async () => { 
        await Promise.all([
            _model.unregisterIP(ips[0]),
            _model.unregisterIP(ips[1]),
        ]);
        // @ts-ignore
        _service.blacklist = {};
    });
    afterAll(async () => { 
        await Promise.all([
            _model.unregisterIP(ips[0]),
            _model.unregisterIP(ips[1]),
        ]);
        // @ts-ignore
        _service.blacklist = {};
    });




    it('-Can register multiple IPs, validate their integrity and unregister them: ', async function() {
        // There should be no IPs in the DB
        let savedIPs: IIPBlacklistRecord[] = await _service.getAll();
        expect(savedIPs.length).toBe(0);

        // Register the first IP without notes
        await _service.registerIP(ips[0], undefined);

        // Retrieve the IP and make sure the data is correct
        let ip1: IIPBlacklistRecord|undefined = await _model.get(ips[0]);
        expect(typeof ip1).toBe("object");
        expect(ip1!.ip).toBe(ips[0]);
        expect(ip1!.n).toBe(null!);
        expect(typeof ip1!.c).toBe("number");

        // Make sure the IP was added to the local object
        //@ts-ignore
        expect(_service.blacklist[ips[0]]).toBe(true);

        // Register a second IP with a note
        await _service.registerIP(ips[1], "This is a very dangerous IP!!!!");

        // Retrieve the IP and make sure the data is correct
        let ip2: IIPBlacklistRecord|undefined = await _model.get(ips[1]);
        expect(typeof ip2).toBe("object");
        expect(ip2!.ip).toBe(ips[1]);
        expect(ip2!.n).toBe("This is a very dangerous IP!!!!");
        expect(typeof ip2!.c).toBe("number");

        // Make sure that both IPs are now in the local object
        //@ts-ignore
        expect(_service.blacklist[ips[0]]).toBe(true);
        //@ts-ignore
        expect(_service.blacklist[ips[1]]).toBe(true);

        // Can add notes to the first IP
        await _service.updateNotes(ips[0], "This notes were added after the IP was Blacklisted!!");

        // Retrieve the IP again and make sure the data integrity has maintained
        ip1 = await _model.get(ips[0]);
        expect(typeof ip1).toBe("object");
        expect(ip1!.ip).toBe(ips[0]);
        expect(ip1!.n).toBe("This notes were added after the IP was Blacklisted!!");
        expect(typeof ip1!.c).toBe("number");

        // Can update the notes of the second IP
        await _service.updateNotes(ips[1], "This notes were updated after the IP was Blacklisted!!");
        ip2 = await _model.get(ips[1]);
        expect(typeof ip2).toBe("object");
        expect(ip2!.ip).toBe(ips[1]);
        expect(ip2!.n).toBe("This notes were updated after the IP was Blacklisted!!");
        expect(typeof ip2!.c).toBe("number");

        // Make sure that both IPs are still in the local object
        //@ts-ignore
        expect(_service.blacklist[ips[0]]).toBe(true);
        //@ts-ignore
        expect(_service.blacklist[ips[1]]).toBe(true);

        // Iterate over each IP
        for (let ip of ips) {
            // Unregister the ip
            await _service.unregisterIP(ip);

            // Retrieve the record and make sure it has been removed from the db
            const record: IIPBlacklistRecord|undefined = await _model.get(ip);
            expect(record).toBe(undefined);

            // Make sure that it has been removed from the local object
            //@ts-ignore
            expect(_service.blacklist[ip]).toBe(undefined);
        }
    });





    it('-Can register multiple IPs and verify they have been blacklisted: ', async function() {
        for (let ip of ips) {
            // Register the first IP
            await _service.registerIP(ip, undefined);

            try {
                _service.isIPBlacklisted(ip);
                fail('A blackisted IP should have not passed the check.');
            } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(11000) }
        }
    });





    it('-Can format IPs in order to be verified or blacklisted: ', function() {
        expect(_service.formatIP('192.168.0.1')).toBe('192.168.0.1');
        expect(_service.formatIP('FFFF:192.168.0.1')).toBe('ffff:192.168.0.1');
        expect(_service.formatIP(' FFFF: 192.168.0 . 1 ')).toBe('ffff:192.168.0.1');
    });
});









