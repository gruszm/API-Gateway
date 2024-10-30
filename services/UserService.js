const User = require("../models/userModel.js");
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const emailvalidator = require("email-validator");
const { BadCredentialsError, NotFoundError, AlreadyExistsError, InvalidEmailError, PasswordLengthError } = require("../errors/customErrors.js");

const MIN_PASSWORD_LENGTH = 8;

async function register(email, password) {
    if (!email) throw new BadCredentialsError("Email must be provided.");
    if (!password) throw new BadCredentialsError("Password must be provided.");
    if (!emailvalidator.validate(email)) throw new InvalidEmailError("Email invalid.");
    if (password.length < MIN_PASSWORD_LENGTH) throw new PasswordLengthError(`Provided password is too short. The minimum length is ${MIN_PASSWORD_LENGTH}`);

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email: email, password: hashedPassword });

    try {
        const userDb = await newUser.save();

        return userDb;
    } catch (error) {
        if (error.name === "MongoServerError") {
            throw new AlreadyExistsError(`User with email ${email} already exists.`);
        }
    }
}

async function login(email, password) {
    if (!email) throw new BadCredentialsError("Email must be provided.");
    if (!password) throw new BadCredentialsError("Password must be provided.");
    if (!emailvalidator.validate(email)) throw new InvalidEmailError(`Email ${email} is invalid.`);

    const userDb = await getUserByEmail(email.trim().toLowerCase());

    if (!userDb) throw new NotFoundError("User with email " + email + " does not exist.");
    if (!bcrypt.compareSync(password.trim(), userDb.password)) throw new BadCredentialsError("Wrong password.");

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

module.exports = {
    register: register,
    login: login,
    getUserById: getUserById,
    getUserByEmail: getUserByEmail
};