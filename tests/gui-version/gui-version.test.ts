// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';

// DB Service
import { IDatabaseService, IQueryResult } from "../../src/modules/database";
const _db = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);

// Utils Service
import { IUtilitiesService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// GUI Version Service
import { IGuiVersionService } from "../../src/modules/gui-version";
const _version = appContainer.get<IGuiVersionService>(SYMBOLS.GuiVersionService);


// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');


describe('GUI Version Tests:', async function() {
    beforeEach(async () => { await _db.query({text: `DELETE FROM ${_db.tn.gui_version};`})});
    afterAll(async () => { await _db.query({text: `DELETE FROM ${_db.tn.gui_version};`})});


    it('-Can initialize the GUI Version: ', async function() {
        // In the beginning, there was nothing
        let version: string|undefined = await getSnapshot();
        expect(version).toBe(undefined);

        // If the db record has not been set, it should return the default version
        version = await _version.get();
        //@ts-ignore
        expect(version).toBe(_version.defaultVersion);

        // The record should have been inserted correctly
        version = await getSnapshot();
        //@ts-ignore
        expect(version).toBe(_version.defaultVersion);
    });


    it('-Can update the GUI version: ', async function() {
        // Initialize the version
        let version: string = await _version.get();
        //@ts-ignore
        expect(version).toBe(_version.defaultVersion);

        // Update the version
        await _version.update('0.0.2');

        // Retrieve the version again and make sure it has been updated
        version = await _version.get();
        expect(version).toBe('0.0.2');
    });


    it('-Can only update the GUI version with correct values: ', async function() {
        // Initialize the version
        let version: string = await _version.get();

        // Invalid type
        try {
            // @ts-ignore
            await _version.update(123456789);
            fail(`It should have not updated the version with an invalid type. 1`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }
        try {
            // @ts-ignore
            await _version.update(true);
            fail(`It should have not updated the version with an invalid type. 2`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }
        try {
            // @ts-ignore
            await _version.update({foo: 'bar'});
            fail(`It should have not updated the version with an invalid type. 3`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }

        // Invalid length
        try {
            await _version.update('0.0.');
            fail(`It should have not updated the version with an invalid length. 1`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }
        try {
            await _version.update('55550.444440.88888');
            fail(`It should have not updated the version with an invalid length. 2`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }
        try {
            await _version.update('sadas3d12as32d13as1da4sd65sa4d3a1sd23as1d43asd');
            fail(`It should have not updated the version with an invalid length. 3`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }

        // Invalid format
        try {
            await _version.update('0.0.0.0');
            fail(`It should have not updated the version with an invalid format. 1`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }
        try {
            await _version.update('0.0');
            fail(`It should have not updated the version with an invalid format. 2`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }
        try {
            await _version.update('0..0.15');
            fail(`It should have not updated the version with an invalid format. 3`);
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(7000) }
    });
});










/**
 * Returns the current version snapshot.
 * @returns Promise<string|undefined>
 */
async function getSnapshot(): Promise<string|undefined> {
    const {rows}: IQueryResult = await _db.query({
        text: `SELECT version FROM ${_db.tn.gui_version} WHERE id=1`,
        values: []
    });
    return rows.length ? rows[0].version: undefined;
}