import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { getUserByEmail, getUserById, login, register } from "../../src/services/userService.js";
import { AlreadyExistsError, BadCredentialsError, InvalidEmailError, NotFoundError, PasswordLengthError } from "../../src/errors/customErrors.js";
import * as mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../../src/models/userModel.js";
import { compareSync } from "bcrypt";
import JWT from "jsonwebtoken";
const { expect } = chai;

chai.use(chaiAsPromised);

let mongoServer, mongooseConnection;

before(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongooseConnection = await mongoose.connect(mongoServer.getUri());
});

after(async () => {
    await mongooseConnection.disconnect();
    await mongoServer.stop();
});

describe("User Service", () => {
    const exEmail = "some_email@gmail.com";
    const exPassword = "password";

    describe("Register function", () => {

        afterEach(async () => {
            await User.deleteMany();
        });

        it("should throw BadCredentialsError when invoked without email", async () => {
            await expect(register(null, exPassword)).to.be.rejectedWith(BadCredentialsError, "Email");
        });

        it("should throw BadCredentialError when invoked without password", async () => {
            await expect(register(exEmail, null)).to.be.rejectedWith(BadCredentialsError, "Password");
        });

        it("should throw InvalidEmailError when invoked with invalid email", async () => {
            await expect(register("not_an_email", exPassword)).to.be.rejectedWith(InvalidEmailError);
        });

        it("should throw PasswordLengthError when invoked with too short password", async () => {
            await expect(register(exEmail, "qwerty")).to.be.rejectedWith(PasswordLengthError);
        });

        it("should add a new User to the database", async () => {
            const userDb = await register(exEmail, exPassword);

            expect(userDb).to.not.be.null;
        });

        it("should add a new User to the database with matching password", async () => {
            const userDb = await register(exEmail, exPassword);

            expect(compareSync(exPassword, userDb.password)).to.be.true;
        });

        it("should add a new User to the database with all letters lowercase", async () => {
            const userDb = await register(exEmail.toUpperCase(), exPassword);

            expect(userDb.email).to.be.equal(exEmail);
        });

        it("should add a new User to the database with trimmed email and password", async () => {
            const userDb = await register(`  ${exEmail}   `, `   ${exPassword}  `);

            expect(userDb.email).to.be.equal(exEmail);
            expect(compareSync(exPassword, userDb.password)).to.be.true;
        });

        it("should throw AlreadyExistsError when trying to create a User with the same email more than once", async () => {
            await register(exEmail, exPassword);

            await expect(register(exEmail, exPassword)).to.be.rejectedWith(AlreadyExistsError);
        });
    });

    describe("Login function", () => {

        before(async () => {
            process.env.SECRET_KEY = "SECRET";

            const userDb = await register(exEmail, exPassword);
        });

        after(async () => {
            delete process.env.SECRET_KEY;

            await User.deleteMany();
        });

        it("should throw BadCredentialsError when invoked without email", async () => {
            await expect(login(null, exPassword)).to.be.rejectedWith(BadCredentialsError, "Email");
        });

        it("should throw BadCredentialError when invoked without password", async () => {
            await expect(login(exEmail, null)).to.be.rejectedWith(BadCredentialsError, "Password");
        });

        it("should throw InvalidEmailError when invoked with invalid email", async () => {
            await expect(login("some_text", exPassword)).to.be.rejectedWith(InvalidEmailError);
        });

        it("should throw NotFoundError when using an email, which does not exist in the database", async () => {
            await expect(login("not_existing_email@gmail.com", exPassword)).to.be.rejectedWith(NotFoundError);
        });

        it("should not throw NotFoundError when using an existing email, but with different letter case", async () => {
            await expect(login(exEmail.toUpperCase(), exPassword)).to.not.be.rejectedWith(NotFoundError);
        });

        it("should not throw NotFoundError when using an existing email, but not trimmed", async () => {
            await expect(login(`   ${exEmail}  `, exPassword)).to.not.be.rejectedWith(NotFoundError);
        });

        it("should throw BadCredentialsError when wrong password is passed", async () => {
            const exPasswordRepeated = exPassword + exPassword;

            await expect(login(exEmail, exPasswordRepeated)).to.be.rejectedWith(BadCredentialsError, "Wrong password.");
        });

        it("should return a valid token when correct credentials are passed", async () => {
            const token = await login(exEmail, exPassword);

            expect(token).to.not.be.null;

            const verifiedToken = JWT.verify(token, process.env.SECRET_KEY);

            expect(verifiedToken.email).to.be.equal(exEmail);
        });
    });

    describe("Get User by ID", () => {
        let userDb;

        before(async () => {
            userDb = await register(exEmail, exPassword);

            expect(userDb).to.not.be.null;
        });

        after(async () => {
            await User.deleteMany();
        });

        it("should find user by ID in the database", async () => {
            const foundUser = await getUserById(userDb._id);

            expect(foundUser).to.not.be.null;
            expect(foundUser._id.toHexString()).to.be.equal(userDb._id.toHexString());
        });
    });

    describe("Get User by email", () => {
        let userDb;

        before(async () => {
            userDb = await register(exEmail, exPassword);

            expect(userDb).to.not.be.null;
        });

        after(async () => {
            await User.deleteMany();
        });

        it("should find user by email in the database", async () => {
            const foundUser = await getUserByEmail(exEmail);

            expect(foundUser).to.not.be.null;
            expect(foundUser._id.toHexString()).to.be.equal(userDb._id.toHexString());
        });
    });
});