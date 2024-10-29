const mongoose = require('mongoose');
// const AutoIncrement = require("mongoose-sequence")(mongoose);

const userSchema = new mongoose.Schema(
    {
        email:
        {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            validate: {
                validator: function (text) {
                    let valid = true;

                    valid &= text.indexOf("@") > 0;
                    valid &= text.endsWith(".com");

                    return valid;
                }
            }
        },
        password: {
            type: String,
            required: true,
            trim: true
        }
    }
);

// userSchema.plugin(AutoIncrement);

module.exports = mongoose.model("User", userSchema);