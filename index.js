const express = require("express");
const AuthMiddleware = require("./middlewares/AuthMiddleware.js");

const app = express();

app.use(express.json());

app.post("/api/register", async (req, res) => {

});

app.use(AuthMiddleware);

app.listen(process.env.PORT, () => {
    console.log("API Gateway is running on port: " + process.env.PORT);
});