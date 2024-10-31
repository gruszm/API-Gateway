import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { register } from "../../src/services/userService.js";
import { BadCredentialsError } from "../../src/errors/customErrors.js";

chai.use(chaiAsPromised);

const expect = chai.expect;

describe("User Service", () => {
    describe("Register function", () => {
        it("should throw BadCredentialsError when invoked without email", async () => {
            await expect(register(null, "some_password")).to.be.rejectedWith(BadCredentialsError, "Email");
        });

        it("should throw BadCredentialError when invoked without password", async () => {
            await expect(register("some_email@some_domain.com", null)).to.be.rejectedWith(BadCredentialsError, "Password");
        });
    });
});