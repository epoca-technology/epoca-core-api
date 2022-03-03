// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';
import { IAuthority } from "../../src/modules/auth";


// Validations Service
import { IValidationsService } from "../../src/modules/utilities";
const _validations = appContainer.get<IValidationsService>(SYMBOLS.ValidationsService);


// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');


/* UUID Validations Testing performed in utils.tests */



describe('Auth Validation Tests:', function() {
    // Email
    it('-Can identify valid emails: ', function() {
        expect(_validations.emailValid('jessdotjs@gmail.com')).toBeTruthy();
        expect(_validations.emailValid('plutus.web.app@gmail.com')).toBeTruthy();
        expect(_validations.emailValid('SomeCoolEmail@ProtonMail.com')).toBeTruthy();
    });

    it('-Can identify invalid emails: ', function() {
        expect(_validations.emailValid('jessdotjs@gmail.')).toBeFalsy();
        expect(_validations.emailValid('Asd.com')).toBeFalsy();
        expect(_validations.emailValid('YKalcka@asds145123')).toBeFalsy();
    });


    // Password
    it('-Can identify valid passwords: ', function() {
        expect(_validations.passwordValid('SomeSickPassword123456')).toBeTruthy();
        expect(_validations.passwordValid('asDa465123cd45s7a52d123as5sFD_a$5f12aArkljns,masdlasikjdhj,mknwq.kljahsdna,mndasd;w$$$41454212313asdasdDASdaskljdkasdjlkasdkjbcm,nbau22312SA!23465987451546adkljasd%43214234oiuyhkajmsndbk,mahslduy33443')).toBeTruthy();
        expect(_validations.passwordValid('Dsadert1')).toBeTruthy();
    });

    it('-Can identify invalid passwords: ', function() {
        expect(_validations.passwordValid('123456')).toBeFalsy();
        expect(_validations.passwordValid('asDa465123cd45s7a52d123as5sFD_a$5f12aArkljns,masdlasikjdhj,mknwq.kljahsdna,mndasd;w$$$41454212313asdasdDASdaskljdkasdjlkasdkjbcm,nbau22312SA!23465987451546adkljasd%43214234oiuyhkajmsndbk,mahslduy3344aasdasdasdasdasdasdasdasd3')).toBeFalsy();
        expect(_validations.passwordValid('Dasdasde')).toBeFalsy();
        expect(_validations.passwordValid('Dasdas1')).toBeFalsy();
        expect(_validations.passwordValid('Dasdas##')).toBeFalsy();
    });


    // Authority
    it('-Can identify valid authority without providing the max authority value: ', function() {
        expect(_validations.authorityValid(1)).toBeTruthy();
        expect(_validations.authorityValid(2)).toBeTruthy();
        expect(_validations.authorityValid(3)).toBeTruthy();
        expect(_validations.authorityValid(4)).toBeTruthy();
        expect(_validations.authorityValid(5)).toBeTruthy();
    });

    it('-Can identify invalid authority without providing the max authority value: ', function() {
        expect(_validations.authorityValid(<IAuthority>0)).toBeFalsy();
        expect(_validations.authorityValid(<IAuthority>6)).toBeFalsy();
    });

    it('-Can evaluate the validity of an authority providing the max authority param: ', function() {
        expect(_validations.authorityValid(4, 4)).toBeTruthy();
        expect(_validations.authorityValid(5, 5)).toBeTruthy();
        expect(_validations.authorityValid(5, 4)).toBeFalsy();
    });
});





describe('FCM Token Validation Tests:', function() {
    it('-Can identify valid FCM Tokens: ', function() {
        expect(_validations.fcmTokenValid('eZv8YG3fNTa8vPVnfOoXpM:APA91bHCNfVwEieNLhMZVdEqln40zMT7FSCGdogTf0LMfffGwZS9rNcAXXMH8e4dznw3GvhkhfFhctZfi_xO2p-_LJ-IwkzcmWr1fLcv08mToqbBdd9j8-mjzsp1eEtY5rEwtzgEwRsy')).toBeTruthy();
        expect(_validations.fcmTokenValid('el9dYLXOT3g:APA91bHPXjh6hSYhlbA4EW89dMrN2WPPFAXtKhhTS_nyeMVyStICymLLi0VTvTIGHW2mekWySPa9ZCwmbwgUHEEe6D6he9FMUdXe9HU6KfooWeMMvbdwhwlsdT6Csba51yiKyiKwP3FS')).toBeTruthy();
        expect(_validations.fcmTokenValid('cQahaFLtSZ6BogfCVRWPpQ:APA91bEmfFa_riXJMfZzxTBha5jyJ0hddmt90mFQfraBl_bDh8sy_eC1H41Vl1wPfwYrJMzXi6LBvtJLpi5q3K6lNv9oX5I2wO05j2QCu9lwyMgycFjAOxKYxF5H-nQTqzAnZ02cpoVJ')).toBeTruthy();
        expect(_validations.fcmTokenValid('f0gj-FU1KM7umZnt04IT8q:APA91bGRdsAx5Ii0n2lyfYZ5bDwXLCWJ-vO9JVwCBim6dzwMnBKrhAfw9b1-f84DZRYXv3ZsLb_I4t1WnXiaIe2cyzGJEx3wnBRZDa0c-LL_EtlXO42gtU0yNh9eOorINFgAzSzeSGsb')).toBeTruthy();
        expect(_validations.fcmTokenValid('eEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kF')).toBeTruthy();
        expect(_validations.fcmTokenValid('el9dYLXOT3g:APA91bHPXjh6hSYhlbA4EW89dMrN2WPPFAXtKhhTS_nyeMVyStICymLLi0VTvTIGHW2mekWySPa9ZCwmbwgUHEEe6D6he9FMUdXe9HU6KfooWeMMvbdwhwlsdT6Csba51yiKyiKwP3FS')).toBeTruthy();
        expect(_validations.fcmTokenValid('eEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kF')).toBeTruthy();
    });


    it('-Can identify invalid FCM Tokens: ', function() {
        expect(_validations.fcmTokenValid('asd')).toBeFalsy();
        expect(_validations.fcmTokenValid('eEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kF')).toBeFalsy();
    });
});







describe('API Secret Tests:', function() {
    it('-Can identify valid secrets: ', function() {
        expect(_validations.apiSecretValid('123456asd9')).toBeTruthy();
        expect(_validations.apiSecretValid('4564564554')).toBeTruthy();
        expect(_validations.apiSecretValid('asdasdasdd')).toBeTruthy();
    });

    it('-Can identify invalid secrets: ', function() {
        expect(_validations.apiSecretValid('123456asd')).toBeFalsy();
        expect(_validations.apiSecretValid('4564564554sad')).toBeFalsy();
        // @ts-ignore
        expect(_validations.apiSecretValid(564654121)).toBeFalsy();
    });
});







describe('OTP Token Tests:', function() {
    it('-Can identify valid otp tokens: ', function() {
        expect(_validations.otpTokenValid('123456')).toBeTruthy();
        expect(_validations.otpTokenValid('654321')).toBeTruthy();
        expect(_validations.otpTokenValid('199452')).toBeTruthy();
    });

    it('-Can identify invalid otp tokens: ', function() {
        expect(_validations.otpTokenValid('123456asd')).toBeFalsy();
        expect(_validations.otpTokenValid('4564564554sad')).toBeFalsy();
        // @ts-ignore
        expect(_validations.otpTokenValid(123456)).toBeFalsy();
    });
});







describe('ID Token Tests:', function() {
    it('-Can identify valid id tokens: ', function() {
        expect(_validations.idTokenValid('eEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kF')).toBeTruthy();
        expect(_validations.idTokenValid('eEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kF')).toBeTruthy();
    });

    it('-Can identify invalid otp tokens: ', function() {
        expect(_validations.idTokenValid('eEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo')).toBeFalsy();
        expect(_validations.idTokenValid('eEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-kPvFq51kFeEX9ufPX05c:APA91bEjK8RL4lMWMl6t3knHncKvyuIoyZ1EWlzn5EIo2nQVfqKageY7qh2xpFQEoMxCSFdk6FGVePLhi8lCFV135QX2khjptet5_MqRUXpzCcpqkT1JlEijZWtUobMLKl-')).toBeFalsy();
    });
});







describe('Number Validation Tests:', function() {
    it('-Can identify valid numbers: ', function() {
        expect(_validations.numberValid(1)).toBeTruthy();
        expect(_validations.numberValid(0)).toBeTruthy();
        expect(_validations.numberValid(-1)).toBeTruthy();
        expect(_validations.numberValid(2, 1, 3)).toBeTruthy();
        expect(_validations.numberValid(10, 5, 1000)).toBeTruthy();
    });

    it('-Can identify invalid number formats: ', function() {
        // @ts-ignore
        expect(_validations.numberValid('asdsad')).toBeFalsy();
        // @ts-ignore
        expect(_validations.numberValid('123')).toBeFalsy();
        // @ts-ignore
        expect(_validations.numberValid(true)).toBeFalsy();
        // @ts-ignore
        expect(_validations.numberValid({foo: 'bar'})).toBeFalsy();
    });


    it('-Can validate numbers within a range: ', function() {
        expect(_validations.numberValid(1, 2)).toBeFalsy();
        expect(_validations.numberValid(4, 1, 3)).toBeFalsy();
        expect(_validations.numberValid(3, 1, 3)).toBeTruthy();
        expect(_validations.numberValid(1500, 1501, 2000)).toBeFalsy();
    });
});











describe('IP Validation Tests:', function() {
    it('-Can identify valid IPs: ', function() {
        expect(_validations.ipValid('192.168.1.1')).toBeTruthy();
        expect(_validations.ipValid('ffff:192.168.1.1')).toBeTruthy();
        expect(_validations.ipValid('ffff:192.168.1.1:5465:12')).toBeTruthy();
        expect(_validations.ipValid('ffff:192.168.1.1:5465:12-_')).toBeTruthy();
    });

    it('-Can identify invalid IPs: ', function() {
        expect(_validations.ipValid('asds')).toBeFalsy();
        expect(_validations.ipValid('asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564')).toBeFalsy();
        // @ts-ignore
        expect(_validations.ipValid({foo: 'bar'})).toBeFalsy();
    });



    it('-Can identify valid IP Notes: ', function() {
        expect(_validations.ipNotesValid('This is just a valid note, anything under 5 and 3k characters should work.')).toBeTruthy();
    });

    it('-Can identify invalid IP Notes: ', function() {
        expect(_validations.ipNotesValid('asds')).toBeFalsy();
        expect(_validations.ipNotesValid('asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkg')).toBeFalsy();
        // @ts-ignore
        expect(_validations.ipNotesValid({foo: 'bar'})).toBeFalsy();
    });
});