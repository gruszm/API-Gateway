import { StatusCodes as HttpStatus } from "http-status-codes";
import jsonwebtoken from "jsonwebtoken";

const AuthHandler = (req, res, next) => {
    if (req.url.startsWith("/api/secure")) {
        const token = req.headers["authorization"] && req.headers["authorization"].split(" ")[1];

        if (!token) {
            res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authorization token required" });
            return;
        }

        jsonwebtoken.verify(token, process.env.SECRET_KEY, (error, decoded) => {
            if (error) {
                res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authorization error: " + error.message });
                return;
            }

            req.headers.user = decoded;
            delete req.headers["authorization"];

            next();
        });
    } else if (req.url.startsWith("/api/public") || req.url.startsWith("/api/login") || req.url.startsWith("/api/register")) {
        next();
    } else {
        res.status(HttpStatus.BAD_REQUEST).json({ message: "Bad request. Endpoint should start with \"/api/public\" or \"/api/secure\"." });
    }
}

export { AuthHandler };