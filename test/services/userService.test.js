import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { register } from "../../src/services/userService.js";
import { AlreadyExistsError, BadCredentialsError, InvalidEmailError, PasswordLengthError } from "../../src/errors/customErrors.js";
import * as mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../../src/models/userModel.js";
import { compareSync } from "bcrypt";
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

afterEach(async () => {
    await User.deleteMany();
});

describe("User Service", () => {
    describe("Register function", () => {
        const exampleEmail = "some_email@gmail.com";
        const examplePassword = "password";

        it("should throw BadCredentialsError when invoked without email", async () => {
            await expect(register(null, "some_password")).to.be.rejectedWith(BadCredentialsError, "Email");
        });

        it("should throw BadCredentialError when invoked without password", async () => {
            await expect(register("some_email@some_domain.com", null)).to.be.rejectedWith(BadCredentialsError, "Password");
        });

        it("should throw InvalidEmailError when invoked with invalid email", async () => {
            await expect(register("some_text", "some_password")).to.be.rejectedWith(InvalidEmailError);
        });

        it("should throw PasswordLengthError when invoked with too short password", async () => {
            await expect(register(exampleEmail, "qwerty")).to.be.rejectedWith(PasswordLengthError);
        });

        it("should add a new User to the database", async () => {
            const userDb = await register(exampleEmail, examplePassword);

            expect(userDb).to.not.be.null;
        });

        it("should add a new User to the database with matching password", async () => {
            const userDb = await register(exampleEmail, examplePassword);

            expect(compareSync(examplePassword, userDb.password)).to.be.equal;
        });

        it("should throw AlreadyExistsError when trying to create a User with the same email more than once", async () => {
            await register(exampleEmail, examplePassword);

            await expect(register(exampleEmail, examplePassword)).to.be.rejectedWith(AlreadyExistsError);
        });
    });
});