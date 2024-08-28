import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Post means a way of interaction with the server and it is used for sending the data
router.route("/register").post(
     upload.fields([
          {
               name: "avatar",
               maxCount: 1
          },
          {
               name: "coverImage",
               maxCount : 1
          }
     ]),
     registerUser
);

export default router;