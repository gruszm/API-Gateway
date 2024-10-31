import * as mongoose from "mongoose";

async function connect(hostname, port) {
    const url = `mongodb://${hostname}:${port}/users`;

    try {
        await mongoose.connect(url);

        console.log("Successfully connected to database on url " + url);
    } catch (error) {
        console.log(`Could not connect to database on url ${url}: ${error.message}`);

        process.exit(1);
    }
}

export { connect };