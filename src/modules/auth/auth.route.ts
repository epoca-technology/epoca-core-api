// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {highRiskLimit, ultraHighRiskLimit, IRequestGuardService} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Auth Service
import {IAuthService, IUser} from './interfaces';
const _auth: IAuthService = appContainer.get<IAuthService>(SYMBOLS.AuthService);


// Init Route
const AuthRoute = express.Router();





/* Retrievers */


/**
 * Retrieves a list with all the registered users.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 5
 * @returns IAPIResponse<IUser[]>
 */
AuthRoute.route(`/getAll`).get(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5);

        // Perform Action
        const users: IUser[] = await _auth.getAll();

        // Return the response
        res.send(_utils.apiResponse(users));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});









/* User Management */




/**
 * Creates a new user and it also generates the API secret and returns the uid. 
 * If an error is thrown, it will attempt to rollback the creation.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 5
 * @param email 
 * @param authority 
 * @returns IAPIResponse<IUser[]>
 */
 AuthRoute.route(`/createUser`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5, ['email', 'authority'], req.body, otp || '');

        // Perform Action
        await _auth.createUser(req.body.email, req.body.authority);

        // Retrieve the refreshed list
        const users: IUser[] = await _auth.getAll();

        // Return the response
        res.send(_utils.apiResponse(users));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});








/**
 * Updates a user's email on both, Firebase & DB.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 5
 * @param uid 
 * @param newEmail 
* @returns IAPIResponse<IUser[]>
*/
 AuthRoute.route(`/updateEmail`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5, ['uid', 'newEmail'], req.body, otp || '');

        // Perform Action
        await _auth.updateEmail(req.body.uid, req.body.newEmail);

        // Retrieve the refreshed list
        const users: IUser[] = await _auth.getAll();

        // Return the response
        res.send(_utils.apiResponse(users));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});






/**
 * Updates a user's password on Firebase.
 * @param email 
 * @param newPassword 
 * @param otp 
 * @param recaptcha 
* @returns IAPIResponse<void>
*/
AuthRoute.route(`/updatePassword`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const ip: string = req.clientIp;

    try {
        // Validate the request
        _guard.validatePublicRequest(ip, ['email', 'newPassword', 'otp', 'recaptcha'], req.body)

        // Perform Action
        await _auth.updatePassword(req.body.email, req.body.newPassword, req.body.otp, req.body.recaptcha);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});






/**
 * Updates a user's OTP Secret on the db.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 5
 * @param uid 
* @returns IAPIResponse<IUser[]>
*/
AuthRoute.route(`/updateOTPSecret`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5, ['uid'], req.body, otp || '');

        // Perform Action
        await _auth.updateOTPSecret(req.body.uid);

        // Retrieve the refreshed list
        const users: IUser[] = await _auth.getAll();

        // Return the response
        res.send(_utils.apiResponse(users));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
 * Updates a user's authority on the DB and on the local object.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 5
 * @param uid 
 * @param newAuthority 
* @returns IAPIResponse<IUser[]>
*/
AuthRoute.route(`/updateAuthority`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5, ['uid', 'newAuthority'], req.body, otp || '');

        // Perform Action
        await _auth.updateAuthority(req.body.uid, req.body.newAuthority);

        // Retrieve the refreshed list
        const users: IUser[] = await _auth.getAll();

        // Return the response
        res.send(_utils.apiResponse(users));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});






/**
 * Updates a user's authority on the DB and on the local object.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param newFCMToken 
* @returns IAPIResponse<void>
*/
AuthRoute.route(`/updateFCMToken`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ['newFCMToken'], req.body);

        // Perform Action
        await _auth.updateFCMToken(reqUid, req.body.newFCMToken);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Deletes a user from Firebase and the database.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 5
 * @param uid 
* @returns IAPIResponse<IUser[]>
*/
AuthRoute.route(`/deleteUser`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5, ['uid'], req.body, otp || '');

        // Perform Action
        await _auth.deleteUser(req.body.uid);

        // Retrieve the refreshed list
        const users: IUser[] = await _auth.getAll();

        // Return the response
        res.send(_utils.apiResponse(users));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});












/* Sign In */




/**
 * After verifying the provided credentials are valid, it generates the sign in token.
 * @param email 
 * @param password 
 * @param otp 
 * @param recaptcha 
* @returns IAPIResponse<string>
*/
AuthRoute.route(`/getSignInToken`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const ip: string = req.clientIp;

    try {
       // Validate the request
       _guard.validatePublicRequest(ip, ['email', 'password', 'otp', 'recaptcha'], req.body);

       // Perform Action
       const token: string = await _auth.getSignInToken(req.body.email, req.body.password, req.body.otp, req.body.recaptcha);

       // Return the response
       res.send(_utils.apiResponse(token));
   } catch (e) {
       console.log(e);
       res.send(_utils.apiResponse(undefined, e));
   }
});







// Export Routes
export {AuthRoute}

