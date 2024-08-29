import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
     {
          username: {
               type: String,
               required: true,
               unique: true,
               lowercase: true,
               trim: true,
               index: true
          },
          email: {
               type: String,
               required: true,
               unique: true,
               lowercase: true,
               trim: true,
          },
          fullname: {
               type: String,
               required: true,
               trim: true,
               index: true
          },
          avatar: {
               type: String, // cloudinary url
               required: true
          },
          coverImage: {
               type: String, // cloudinary url
          },
          watchHistory: [
               {
                    type: Schema.Types.ObjectId,
                    ref: "Video"
               }
          ],
          password: {
               type: String,
               required: [true, 'Password is required']
          },
          refreshToken: {
               type: String
          }
     },
     { timestamps: true }
);

// This code is written for the encryption and this function pre is the middleware which is been called just before the data gets saved

userSchema.pre("save", async function (next) {
     if (!this.isModified("password")) return next();
     this.password = await bcrypt.hash(this.password, 10)
     next()
});

// Here, we are writing some custom methods to verify before importing that whether the user has entered the correct password or not since the password is encrypted before storing it un in the database

userSchema.methods.isPasswordCorrect = async function (password) {
     return await bcrypt.compare(password, this.password);
}

// Function to create the access token
userSchema.methods.generateAccessToken = function () {
     return jwt.sign(
          {
               _id: this._id,
               email: this.email,
               username: this.username,
               fullname: this.fullname
          },
          process.env.ACCESS_TOKEN_SECRET,
          {
               expiresIn: process.env.ACCESS_TOKEN_EXPIRY
          }
     )
}

// Function to create the refresh token
userSchema.methods.generateRefreshToken = function () {
     return jwt.sign(
          {
               _id: this._id
          },
          process.env.REFRESH_TOKEN_SECRET,
          {
               expiresIn: process.env.REFRESH_TOKEN_EXPIRY
          }
     )
}

export const User = mongoose.model("User", userSchema); 
// This user is directly connected with the mongoDB database