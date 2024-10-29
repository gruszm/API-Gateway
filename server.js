const express = require("express");
const AuthMiddleware = require("./middlewares/authMiddleware.js");
const MongoConnection = require("./config/db.js");
const HttpStatus = require("http-status-codes").StatusCodes;
const UserService = require("./services/userService.js");

const app = express();

MongoConnection.connect();

app.use(express.json());

app.post("/api/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        const userDb = await UserService.register(email, password);

        res.status(HttpStatus.CREATED).json(userDb);
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: `Error ${error.name}: ${error.message}` });
    }
});

app.use(AuthMiddleware);

app.listen(process.env.PORT, () => {
    console.log("API Gateway is running on port: " + process.env.PORT);
});