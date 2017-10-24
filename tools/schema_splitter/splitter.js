module.exports = {
    main: main
};

const fs = require('fs');
const { printSplitHelp } = require('./help');

function main(schemaPath, outputPath) {
    //If --h/--help, show help and exit
    if (schemaPath === "--h" || schemaPath === "--help") {
        printSplitHelp();
        return;
    }

    //Define the different buffers that will be used
    var currentItem = [];
    var common = {}, objects = {}, interfaces = {}, scalars = {}, inputs = {}, nonNulls = {}, enums = {}, lists = {}, unions = {};

    //If no arguments, print message and return
    if (!schemaPath) {
        console.log('ERROR: Please, introduce schema path as first argument.');
        return;
    }
    //If schema file does not exist return error
    if (!fs.existsSync(schemaPath)) {
        console.log('ERROR: Schema file does not exist.');
        return;
    }
    //If result path does not exist us project path
    var resultPath;
    if (outputPath && fs.existsSync(outputPath)) {
        resultPath = outputPath;
    } else {
        if (outputPath) console.log("Invalid result path. Splitted files will be created on " + __dirname);
        resultPath = __dirname;
    }

    //Read schema file and split it into lines
    var fileLines = fs.readFileSync(schemaPath).toString().split('\n');

    //Query and Mutation type names
    var query, mutation;

    //Iterate through file lines
    for (var i = 0; i < fileLines.length; i++) {
        var line = fileLines[i];
        if (line.length <= 1) continue; //Remove empty lines
        var split = line.split(' ');
        var keyWord = split[0];
        if (!split[1]) continue;
        var itemName = split[1] === "extend" ? split[2].trim() : split[1].trim();


        //Fix possible not separated keys
        if (itemName.substr(itemName.length - 1) == "{") itemName = itemName.substr(0, itemName.length - 1);

        //Save processing line on buffer
        currentItem.push(line);

        //If line is a comment, stop processing
        if (line.trim().charAt(0) == '#') continue;

        //Iterate through item and buffer it
        if (keyWord != "scalar") {
            line = fileLines[++i];
            while (line.charAt(0) != '}') {
                currentItem.push(line);
                line = fileLines[++i];
            }
            currentItem.push(fileLines[i]);
        }

        //Save object on corresponding array
        switch (keyWord) {
            case "type":
                if (itemName === query || itemName === mutation) common[itemName] = currentItem;
                else objects[itemName] = currentItem;
                break;
            case "interface":
                interfaces[itemName] = currentItem;
                break;
            case "scalar":
                scalars[itemName] = currentItem;
                break;
            case "input":
                inputs[itemName] = currentItem;
                break;
            case "enum":
                enums[itemName] = currentItem;
                break;
            case "schema":
                //Extract Query and Mutation type names
                currentItem.forEach(x => {
                    if (x.indexOf("query") > -1) { query = x.substr(x.indexOf(":") + 1, x.length - 1).trim(); }
                    else if (x.indexOf("mutation") > -1) { mutation = x.substr(x.indexOf(":") + 1, x.length - 1).trim(); }
                });
                common["schema"] = currentItem;
                break;
        }

        //Empty buffer
        currentItem = [];
    }


    //Write every file
    if (!fs.existsSync(resultPath + "/commons")) fs.mkdirSync(resultPath + "/commons");
    writeItems(resultPath, "common", common);

    if (objects != {}) {
        if (!fs.existsSync(resultPath + "/objects")) fs.mkdirSync(resultPath + "/objects");
        writeItems(resultPath, "object", objects);
    }
    if (interfaces != {}) {
        if (!fs.existsSync(resultPath + "/interfaces")) fs.mkdirSync(resultPath + "/interfaces");
        writeItems(resultPath, "interface", interfaces);
    }
    if (scalars != {}) {
        if (!fs.existsSync(resultPath + "/scalars")) fs.mkdirSync(resultPath + "/scalars");
        writeItems(resultPath, "scalar", scalars);
    }
    if (inputs != {}) {
        if (!fs.existsSync(resultPath + "/inputs")) fs.mkdirSync(resultPath + "/inputs");
        writeItems(resultPath, "input", inputs);
    }
    if (enums != {}) {
        if (!fs.existsSync(resultPath + "/enums")) fs.mkdirSync(resultPath + "/enums");
        writeItems(resultPath, "enum", enums);
    }


    console.log("Splitted sorted schema files created on " + resultPath + ".");
}


//AUX FUNCTION: Writes a set of similar items into a file.
function writeItems(path, itemType, items) {
    var basePath = path + "/" + itemType + "s/" + itemType + "_";

    //iterate through items
    Object.keys(items).forEach(function (x) {
        var resultFile = basePath + x + ".graphql";

        //Remove file if already exists
        if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);

        //Write element lines
        len = items[x].length;
        for (var i = 0; i < len; i++) fs.appendFileSync(resultFile, items[x][i] + "\n");

    });
}