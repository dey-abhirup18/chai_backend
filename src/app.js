import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";         

const app = express();

// This code is for handling the CORS that is the cross origin errors
app.use(cors({
     origin: process.env.CORS_ORIGIN,
     credentials: true
}))

// use is used for the confoguration and the middleware purpose
// Form data
app.use(express.json({limit: "16kb"}))
// Getting the data from the url
app.use(express.urlencoded({extended: true , limit : "16kb"}))
// when we want to store the files and folders in the server itself
app.use(express.static("public"))
// cookie
app.use(cookieParser());

// routes import
import userRouter from './routes/user.routes.js'

// routes declaration
app.use("/api/v1/users", userRouter)

// http://localhost:8000/api/v1/users/register

export {app};