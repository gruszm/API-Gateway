const mongoose = require("mongoose");

async function connect() {
    try {
        const url = `mongodb://${process.env.DB_SERVICE_NAME}:${process.env.PORT_DB}/users`;

        await mongoose.connect(url);

        console.log("Successfully connected to database on url " + url);
    } catch (error) {
        console.log(`Could not connect to database on url ${url}: ${error.message}`);

        process.exit(1);
    }
}

module.exports = {
    connect: connect
}