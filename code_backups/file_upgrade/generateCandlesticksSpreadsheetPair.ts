// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../ioc";

// Init the File Service
import { IFileService } from "../modules/file";
const _file: IFileService = appContainer.get<IFileService>(SYMBOLS.FileService);



async function main(argv: string[]) {
    await _file.generateCandlesticksSpreadsheetPair();
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