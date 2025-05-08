import * as mongoose from "mongoose";
import mongooseSequence from "mongoose-sequence";

const AutoIncrement = mongooseSequence(mongoose);

const userSchema = new mongoose.Schema(
    {
        email:
        {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password:
        {
            type: String,
            required: true,
            trim: true
        },
        hasElevatedRights:
        {
            type: Boolean,
            required: true,
            default: false
        }
    }
);

userSchema.plugin(AutoIncrement, { inc_field: "id", start_seq: 0 });

export default mongoose.model("User", userSchema);