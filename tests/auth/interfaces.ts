import { IAuthority } from "../../src/modules/auth"





export interface IAuthTestHelper {
    // Properties
    users: ITestUser[],
    fcmTokens: string[],

    // Management
    createTestUser(index: number): Promise<string>,
    deleteTestUsers(): Promise<void>,
}





export interface ITestUser {
    email: string,
    authority: IAuthority,
    password: string
}