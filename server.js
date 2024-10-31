import express from "express";
import AuthMiddleware from "./middlewares/authMiddleware.js";
import * as MongoConnection from "./config/db.js";
import { StatusCodes as HttpStatus } from "http-status-codes";
import * as UserService from "./services/userService.js";
import { BadCredentialsError, NotFoundError, AlreadyExistsError, InvalidEmailError, PasswordLengthError } from "./errors/customErrors.js";

const app = express();

app.use(express.json());

app.post("/api/register", async (req, res) => {
    try {
        const { email, password } = req.body;
        const userDb = await UserService.register(email, password);

        res.status(HttpStatus.CREATED).json(userDb);
    } catch (error) {

        if (error instanceof BadCredentialsError || error instanceof InvalidEmailError || error instanceof PasswordLengthError) {
            res.status(HttpStatus.BAD_REQUEST);
        } else if (error instanceof AlreadyExistsError) {
            res.status(HttpStatus.CONFLICT);
        } else {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
        }

        res.json({ message: `${error.name}: ${error.message}` })
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const token = await UserService.login(email, password);

        res.status(HttpStatus.OK).json({ token: token });
    } catch (error) {

        if (error instanceof InvalidEmailError) {
            res.status(HttpStatus.BAD_REQUEST);
        } else if (error instanceof BadCredentialsError) {
            res.status(HttpStatus.UNAUTHORIZED);
        } else if (error instanceof NotFoundError) {
            res.status(HttpStatus.NOT_FOUND);
        } else {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
        }

        res.json({ message: `${error.name}: ${error.message}` })
    }
});

app.use(AuthMiddleware);

MongoConnection.connect(process.env.DB_SERVICE_NAME, process.env.PORT_DB).then(() => {
    app.listen(process.env.PORT, () => {
        console.log("API Gateway is running on port: " + process.env.PORT);
    });
});