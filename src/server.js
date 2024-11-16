import express from "express";
import { AuthHandler as AuthMiddleware } from "./middlewares/authMiddleware.js";
import * as MongoConnection from "./config/db.js";
import { StatusCodes as HttpStatus } from "http-status-codes";
import * as UserService from "./services/userService.js";
import { BadCredentialsError, NotFoundError, AlreadyExistsError, InvalidEmailError, PasswordLengthError } from "./errors/customErrors.js";
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

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

app.use(createProxyMiddleware({ target: "http://products_service:8081", changeOrigin: true }));
app.use(express.json());
app.use(AuthMiddleware);

MongoConnection.connect(process.env.USERS_DB_SERVICE_NAME).then(() => {
    app.listen(process.env.API_GATEWAY_PORT, () => {
        console.log("API Gateway is running on port: " + process.env.API_GATEWAY_PORT);
    });
});