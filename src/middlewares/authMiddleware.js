import { StatusCodes as HttpStatus } from "http-status-codes";
import jsonwebtoken from "jsonwebtoken";

const AuthHandler = (req, res, next) => {
    const paths = ["/api/secure", "/api/order"];
    let validPath = false;

    for (const path of paths) {
        validPath = (validPath === true) || req.url.startsWith(path);
    }

    if (validPath) {
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

            req.headers["X-User"] = JSON.stringify(decoded);
            delete req.headers["authorization"];

            next();
        });
    } else if (req.url.startsWith("/api/public")) {
        next();
    }
    else {
        res.status(HttpStatus.BAD_REQUEST).json({ message: `Bad request. No endpoint found on url: ${req.url}` });
    }
}

export { AuthHandler };