const User = require("../models/UserModel.js");
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');

async function register(email, password) {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email: email, password: hashedPassword });
        const userDb = await newUser.save();

        return userDb;
    } catch (error) {
        console.log("Error on registering a user: " + error.message);

        return null;
    }
}

async function login(email, password) {
    const userDb = await getUserByEmail(email);

    if (!userDb) {
        console.log("User with email", email, "does not exist.");

        return null;
    }

    if (!bcrypt.compareSync(password, userDb.password)) {
        console.log("Wrong password.");

        return null;
    }

    const payload = { id: userDb._id, email: email };
    const tokenOptions = { expiresIn: "7 days" };
    const token = jsonwebtoken.sign(payload, process.env.SECRET_KEY, tokenOptions);

    return token;
}

async function getUserById(id) {
    return await User.findById(id);
}

async function getUserByEmail(email) {
    return await User.findOne({ email: email });
}

exports = {
    register: register,
    login: login,
    getUserById: getUserById,
    getUserByEmail: getUserByEmail
};