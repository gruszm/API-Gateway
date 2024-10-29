const Express = require("express");
const ProxyMiddleware = require("http-proxy-middleware");
const JsonWebToken = require("jsonwebtoken");
const HttpStatus = require("http-status-codes").StatusCodes;

const app = Express();

app.use((req, res, next) => {
    if (req.url.startsWith("/api/secure")) {
        const token = req.headers["authorization"] && req.headers["authorization"].split(" ")[1];

        if (!token) res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authorization token required" });

        JsonWebToken.verify(token, process.env.SECRET_KEY, (error, decoded) => {
            if (error) res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authorization error" });

            req.headers.userDetails = decoded;
            delete req.headers["authorization"];

            next();
        });
    } else if (req.url.startsWith("/api/public")) {
        next();
    } else {
        res.status(HttpStatus.BAD_REQUEST).json({ message: "Bad request; should start with \"/api/secure\" or \"/api/public\"" });
    }
});