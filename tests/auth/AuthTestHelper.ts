// Dependencies
import {appContainer, SYMBOLS} from '../../src/ioc';
import { IAuthTestHelper, ITestUser } from "./interfaces";



// Auth Model & Service
import {IAuthModel, IAuthService, IUser} from '../../src/modules/auth';
const _model: IAuthModel = appContainer.get<IAuthModel>(SYMBOLS.AuthModel);
const _service: IAuthService = appContainer.get<IAuthService>(SYMBOLS.AuthService);



export class AuthTestHelper implements IAuthTestHelper {


    // Test Users
    public readonly users: ITestUser[] = [
        { email: 'test1@gmail.com', authority: 4, password: 'TestUser1_SuperCool'},
        { email: 'test2@gmail.com', authority: 3, password: 'TestUser2_SuperCool_Too'},
    ];

    // Test FCM Tokens
    public readonly fcmTokens: string[] = [
        "eZv8YG3fNTa8vPVnfOoXpM:APA91bHCNfVwEieNLhMZVdEqln40zMT7FSCGdogTf0LMfffGwZS9rNcAXXMH8e4dznw3GvhkhfFhctZfi_xO2p-_LJ-IwkzcmWr1fLcv08mToqbBdd9j8-mjzsp1eEtY5rEwtzgEwRsy",
        "el9dYLXOT3g:APA91bHPXjh6hSYhlbA4EW89dMrN2WPPFAXtKhhTS_nyeMVyStICymLLi0VTvTIGHW2mekWySPa9ZCwmbwgUHEEe6D6he9FMUdXe9HU6KfooWeMMvbdwhwlsdT6Csba51yiKyiKwP3FS",
    ]


    constructor() {

    }








    /**
     * Creates a user based on provided index.
     * @param index 
     * @returns Promise<string>
     */
    public async createTestUser(index: number): Promise<string> {
        return _service.createUser(this.users[index].email, this.users[index].authority);
    }










    /**
     * Deletes all the test users that currently exist.
     * @returns Promise<void>
     */
    public async deleteTestUsers(): Promise<void> {
        // Iterate over each user
        for (let u of this.users) {
            // Check if it exists. If so, delete it
            const user: IUser|undefined = await _model.getUserByEmail(u.email);
            if (user) {
                await _service.deleteUser(user.uid);
            }
        }
    }
}