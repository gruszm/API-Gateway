import { StatusCodes as HttpStatus } from "http-status-codes";
import jsonwebtoken from "jsonwebtoken";
import * as express from "express";

const orderRouter = express.Router();

const jsonParser = express.json();

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
orderRouter.post("/api/order", jsonParser, async (req, res) => {
    const token = req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
    let decodedUserHeader = null;

    const urlRetrieveCart = `http://carts-service:8082/api/secure/carts/user`;
    const urlRetrieveAddress = `http://profiles-service:8083/api/secure/profiles/addresses/${req.body.addressId}`;
    const urlDecreaseStock = `http://products_service:8081/api/secure/products/decrease`;

    if (!token) {
        res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authorization token required." });

        return;
    }

    try {
        decodedUserHeader = jsonwebtoken.verify(token, process.env.SECRET_KEY);
    }
    catch (error) {
        res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authorization error: " + error.message });

        return;
    }

    try {

        // Retrieve user's cart
        const cartData = await fetch(urlRetrieveCart,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-User": JSON.stringify(decodedUserHeader)
                }
            }
        ).then(res => res.json());

        // Retrieve the address picked by the user
        const addressData = await fetch(urlRetrieveAddress,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-User": JSON.stringify(decodedUserHeader)
                }
            }
        ).then(res => res.json());

        // Delete the address ID and user ID
        delete addressData.id;
        delete addressData.userId;

        // Map the cart entries to product IDs
        const productIds = cartData.cartEntries.map(entry => entry.productId);

        // Create promises to retrieve the price for each product
        const pricePromises = productIds.map(async productId => {
            const urlRetrievePrice = `http://products_service:8081/api/public/products/price/${productId}`;

            const res = await fetch(urlRetrievePrice,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            // Return a promise
            return res.json();
        });

        // Wait until all the prices are retrieved (order is preserved)
        const prices = await Promise.all(pricePromises);

        // Pair each product with its price and quantity
        const orderItems = productIds.map((productId, i) => {
            return {
                productId,
                quantity: cartData.cartEntries[i].quantity,
                price: prices[i]
            };
        });

        // Create the object with order details
        const orderDetails = {
            address: addressData,
            products: orderItems
        };

        const urlCreateOrder = `http://orders-service:8084/api/secure/orders`;

        const orderRes = await fetch(urlCreateOrder,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User": JSON.stringify(decodedUserHeader)
                },
                body: JSON.stringify({ orderDetails })
            }
        );

        if (!orderRes.ok) {
            const errorObject = (orderRes.status !== HttpStatus.NOT_FOUND) ? "" : await orderRes.json();

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: `Order could not be created. ${errorObject.message}` });

            return;
        }

        const urlClearCart = `http://carts-service:8082/api/secure/carts`;

        const clearCartRes = await fetch(urlClearCart,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "X-User": JSON.stringify(decodedUserHeader)
                }
            }
        );

        const decreaseStockPromises = orderItems.map(async orderItem => {
            const body = { productId: orderItem.productId, amount: orderItem.quantity };

            // Return a promise
            return fetch(urlDecreaseStock,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User": JSON.stringify({ hasElevatedRights: true })
                    },
                    body: JSON.stringify(body)
                }
            );
        });

        // Wait until all products have decreased stock
        const decreaseStockResponses = await Promise.all(decreaseStockPromises);

        // Table for collecting possible issues from subsequent operations (cart clear, stock decrease)
        const nok = [];

        if (!clearCartRes.ok) {
            const errorObject = await clearCartRes.json();

            nok.push("Order created, but the cart could not be cleared");
            nok.push(errorObject && errorObject.message);
        }

        if (decreaseStockResponses.some(r => !r.ok)) {
            nok.push("Order created, but the products in stock could not be decreased.");

            const errorMessages = await Promise.all(
                decreaseStockResponses.map(async r => {
                    if (r.status === HttpStatus.BAD_REQUEST) {
                        return;
                    }

                    const errObj = await r.json();
                    return errObj && errObj.message;
                })
            );

            nok.push(...errorMessages);
        }

        if (nok.length > 0) {
            res.status(HttpStatus.CREATED).json({ message: nok.join("; ") });

            return;
        }

        res.status(HttpStatus.OK).send();
    }
    catch (error) {
        console.log(`Error on endpoint: ${req.baseUrl + req.url}\n${error.message}`);

        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Internal server error." });
    }
});

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
orderRouter.all("*", (req, res, next) => {
    next();
});

export { orderRouter as OrderRouter };