import express from "express";
import { AuthHandler as AuthMiddleware } from "./middlewares/authMiddleware.js";
import * as MongoConnection from "./config/db.js";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GatewayRouter } from "./middlewares/gatewayMiddleware.js";
import cors from "cors";
import { OrderRouter } from "./middlewares/orderMiddleware.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use("/", GatewayRouter, OrderRouter);
app.use(AuthMiddleware);
app.use(createProxyMiddleware({ pathFilter: ["/api/public/products", "/api/secure/products"], target: "http://products_service:8081", changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: ["/api/public/carts", "/api/secure/carts"], target: "http://carts-service:8082", changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: ["/api/public/profiles", "/api/secure/profiles"], target: "http://profiles-service:8083", changeOrigin: true }));
app.use(createProxyMiddleware({
    pathFilter: ["/api/public/orders", "/api/secure/orders", "/api/public/delivery", "/api/secure/delivery"],
    target: "http://orders-service:8084", changeOrigin: true
}));

MongoConnection.connect(process.env.USERS_DB_SERVICE_NAME).then(() => {
    app.listen(process.env.API_GATEWAY_PORT, () => {
        console.log("API Gateway is running on port: " + process.env.API_GATEWAY_PORT);
    });
});