// Interface
export interface IEnvironment {
    production: boolean,
}






// Initialize the environment
let environment: IEnvironment;






try {
    // Populate the environment
    environment = {
        production: process.env.production == 'true'
    }


    // Make sure all properties have been set
    for (let key in environment) {
        if (environment[key] === undefined || environment[key] === null || environment[key] === '') {
            throw new Error(`The key (${key}) was not properly set on the server variables.`);
        }
    }
} catch (e) {
    console.log('Error initializing environment variables:');
    throw e;
}






// Export the Environment Variables
export {environment};