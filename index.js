const app = require("express")();
const createProxyMiddleware = require("http-proxy-middleware").createProxyMiddleware;
const jsonwebtoken = require("jsonwebtoken");
const HttpStatus = require("http-status-codes").StatusCodes;

app.use((req, res, next) => {
    if (req.url.startsWith("/api/secure")) {
        const token = req.headers["authorization"] && req.headers["authorization"].split(" ")[1];

        if (!token) res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authorization token required" });

        jsonwebtoken.verify(token, process.env.SECRET_KEY, (error, decoded) => {
            if (error) res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authorization error" });

            req.headers.user = decoded;
            delete req.headers["authorization"];

            next();
        });
    } else if (req.url.startsWith("/api/public")) {
        next();
    } else {
        res.status(HttpStatus.BAD_REQUEST).json({ message: "Bad request; endpoint should start with \"/api/secure\" or \"/api/public\"" });
    }
});

app.listen(process.env.PORT, () => {
    console.log("API Gateway is running on port: " + process.env.PORT);
});