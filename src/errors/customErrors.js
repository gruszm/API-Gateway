class NotFoundError extends Error {
    constructor(message) {
        super(message);

        this.name = "NotFoundError";
    }
}

class BadCredentialsError extends Error {
    constructor(message) {
        super(message);

        this.name = "BadCredentialsError";
    }
}

class AlreadyExistsError extends Error {
    constructor(message) {
        super(message);

        this.name = "AlreadyExistsError";
    }
}

class InvalidEmailError extends Error {
    constructor(message) {
        super(message);

        this.name = "InvalidEmailError";
    }
}

class PasswordLengthError extends Error {
    constructor(message) {
        super(message);

        this.name = "PasswordLengthError";
    }
}

export {
    NotFoundError,
    BadCredentialsError,
    AlreadyExistsError,
    InvalidEmailError,
    PasswordLengthError
};