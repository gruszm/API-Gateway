import express from "express";
import { AuthHandler as AuthMiddleware } from "./middlewares/authMiddleware.js";
import * as MongoConnection from "./config/db.js";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { gatewayRouter } from "./routes/routes.js";
import cors from "cors";

const app = express();

app.use(cors());
app.use(AuthMiddleware);
app.use(createProxyMiddleware({ pathFilter: ["/api/public/products", "/api/secure/products"], target: "http://products_service:8081", changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: ["/api/public/carts", "/api/secure/carts"], target: "http://carts-service:8082", changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: ["/api/public/profiles", "/api/secure/profiles"], target: "http://profiles-service:8083", changeOrigin: true }));
app.use("/", gatewayRouter);

MongoConnection.connect(process.env.USERS_DB_SERVICE_NAME).then(() => {
    app.listen(process.env.API_GATEWAY_PORT, () => {
        console.log("API Gateway is running on port: " + process.env.API_GATEWAY_PORT);
    });
});