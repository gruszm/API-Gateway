import express from "express";
import { StatusCodes as HttpStatus } from "http-status-codes";
import * as UserService from "../services/userService.js";
import { BadCredentialsError, NotFoundError, AlreadyExistsError, InvalidEmailError, PasswordLengthError } from "../errors/customErrors.js";
import jsonwebtoken from "jsonwebtoken";

const gatewayRouter = new express.Router();

const jsonParser = express.json();

gatewayRouter.post("/api/register", jsonParser, async (req, res) => {
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

gatewayRouter.post("/api/login", jsonParser, async (req, res) => {
    try {
        const { email, password } = req.body;
        const loginResponse = await UserService.login(email, password);

        res.status(HttpStatus.OK).json({ token: loginResponse.token, daysUntilExpires: 7, hasElevatedRights: loginResponse.hasElevatedRights });
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

gatewayRouter.post("/api/validate", jsonParser, async (req, res) => {
    try {
        const { token } = req.body;
        const decoded = jsonwebtoken.verify(token, process.env.SECRET_KEY);

        res.json({ hasElevatedRights: decoded.hasElevatedRights });
    } catch (error) {
        res.status(HttpStatus.UNAUTHORIZED).end();
    }
});

gatewayRouter.all("*", (res, req, next) => {
    next();
});

export { gatewayRouter as GatewayRouter };