import User from "../models/userModel.js";
import * as bcrypt from "bcrypt";
import { AlreadyExistsError, BadCredentialsError, InvalidEmailError, NotFoundError, PasswordLengthError } from "../errors/customErrors.js";
import * as emailvalidator from "email-validator";
import jsonwebtoken from "jsonwebtoken";
const { sign } = jsonwebtoken;

const MIN_PASSWORD_LENGTH = 8;

async function register(email, password) {
    if (!email) throw new BadCredentialsError("Email must be provided.");
    if (!password) throw new BadCredentialsError("Password must be provided.");
    if (!emailvalidator.validate(email.trim())) throw new InvalidEmailError(`Email ${email} is invalid.`);
    if (password.length < MIN_PASSWORD_LENGTH) throw new PasswordLengthError(`Provided password is too short. The minimum length is ${MIN_PASSWORD_LENGTH}`);

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
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

    const payload = { id: userDb.id, email: email, hasElevatedRights: userDb.hasElevatedRights };
    const tokenOptions = { expiresIn: "7 days" };
    const token = sign(payload, process.env.SECRET_KEY, tokenOptions);

    return token;
}

async function getUserById(id) {
    return await User.findOne({ id: id });
}

async function getUserByEmail(email) {
    return await User.findOne({ email: email });
}

export { register, login, getUserById, getUserByEmail };