// Here, we are writing the files for our server

// require('dotenv').config({path: './'});

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
     path: './env'
})


connectDB()
.then(() => {
     app.listen(process.env.PORT || 8000, () => {
          console.log(`Server is running at port : ${process.env.PORT}`)
     })
})
.catch((err) => {
     console.log("MONGODB db Connection failed!!! ", err);
})

/*

import express from "express";
const app = express();

(async () => {
     try {
          await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
          app.on("error", (error) => {
               console.log("EROR: ", error);
               throw error;
          })
          app.listen(process.env.PORT , () => {
               console.log(`App is listening on ${process.env.PORT}`)
          })
     } catch (error) {
          console.error("ERROR: ", error);
          throw err
     }
})();

*/