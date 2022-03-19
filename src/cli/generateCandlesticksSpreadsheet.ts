// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../ioc";

// Init the File Service
import { IFileService } from "../modules/file";
const _file: IFileService = appContainer.get<IFileService>(SYMBOLS.FileService);



async function main(argv: string[]) {
    // Init the name
    const fileName: string = argv.slice(2)[0];

    // Make sure the name was provided
    if (!fileName) {
        throw new Error('The file name is required in order to generate the Candlesticks Spreadsheet.');
    }

    // Perform the action
    await _file.generateCandlesticksSpreadsheet(fileName);
}










// Execute the function
main(process.argv)
.then(() => {
    process.exit(0);
})
.catch((e) => {
    console.error(e);
    process.exit(1);
});