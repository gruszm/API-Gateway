import { StatusCodes as HttpStatus } from "http-status-codes";
import jsonwebtoken from "jsonwebtoken";
import * as express from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const orderRouter = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const jsonParser = express.json();
const rawBodyParser = bodyParser.raw({ type: "application/json" });

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
    const urlCreateOrder = `http://orders-service:8084/api/secure/orders`;
    const urlClearCart = `http://carts-service:8082/api/secure/carts`;

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

        // Create promises to retrieve data of each product
        const productPromises = productIds.map(async productId => {
            const urlRetrieveProduct = `http://products_service:8081/api/public/products/${productId}`;

            const res = await fetch(urlRetrieveProduct,
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
        const products = await Promise.all(productPromises);

        // Pair each product with its price and quantity
        let orderItems = productIds.map((productId, i) => {
            return {
                productId,
                quantity: cartData.cartEntries[i].quantity,
                price: products[i].price,
            };
        });

        // Create the object with order details
        const orderDetails = {
            address: addressData,
            products: orderItems
        };

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

        const createdOrder = await orderRes.json();

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

        // Attach the name for each order item
        orderItems = orderItems.map((item, i) => {
            return {
                ...item,
                name: products[i].name,
                imageIds: products[i].imageIds
            };
        });

        // Map the order items for Stripe
        const line_items = orderItems.map(item => {
            const price = Number(item.price) * 100;

            return {
                price_data: {
                    currency: "PLN",
                    product_data: {
                        name: item.name,
                        metadata: {
                            product_id: item.productId,
                            image_ids: item.imageIds.join(",")
                        }
                    },
                    unit_amount: price
                },
                quantity: item.quantity,
            };
        });

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create(
            {
                mode: "payment",
                line_items: line_items,
                success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.CLIENT_URL}/cancel`,
                customer_email: decodedUserHeader.email,
                metadata: { orderId: createdOrder.id },
                allow_promotion_codes: true
            },
            {
                idempotencyKey: `create-checkout-${createdOrder.id}`
            }
        );

        if (nok.length > 0) {
            res.status(HttpStatus.CREATED).json({ message: nok.join("; "), url: checkoutSession.url });

            return;
        }

        res.status(HttpStatus.OK).json({ url: checkoutSession.url });
    }
    catch (error) {
        console.log(`Error on endpoint: ${req.baseUrl + req.url}\n${error.message}`);

        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Internal server error." });
    }
});

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
orderRouter.post("/api/stripe/webhook", rawBodyParser, async (req, res) => {
    const signature = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook signature verification failed.", err.message);
        res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);

        return;
    }

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object;
            const updateStatusUrl = `http://orders-service:8084/api/secure/orders/status`;

            console.log(`Payment succeeded for order ${session.metadata.orderId}`);

            await fetch(updateStatusUrl,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        {
                            hasElevatedRights: true,
                            orderId: session.metadata.orderId,
                            status: "paid"
                        }
                    )
                }).then(async res => {
                    if (!res.ok) {
                        const errorObject = await res.json();

                        console.log(`Error while updating order status: ${errorObject.message}`);
                    }
                }).catch(error => {
                    console.log(`Error while updating order status: ${error.message}`);
                });

            break;
        }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(HttpStatus.OK).end();
});

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
orderRouter.get("/api/stripe/session/:id", async (req, res) => {
    try {
        console.log(req.params.id);

        const session = await stripe.checkout.sessions.retrieve(req.params.id,
            {
                expand: ["line_items.data.price.product"]
            }
        );

        console.log(JSON.stringify(session.line_items));


        const data = {
            orderId: session.metadata?.orderId,
            products: session.line_items?.data.map(line_item => {
                return {
                    productId: line_item.price.product.metadata.productId || line_item.price.product.metadata.product_id,
                    name: line_item.price.product.name,
                    quantity: line_item.quantity,
                    price: line_item.price.unit_amount,
                    amount_total: line_item.amount_total,
                    imageIds: line_item.price.product.metadata.image_ids.split(",")
                };
            })
        };

        res.status(HttpStatus.OK).json(data);
    }
    catch (error) {
        console.log(`Error on endpoint: ${req.baseUrl + req.url}\n${error.message}`);

        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: `Internal server error. ${error.message}` });
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