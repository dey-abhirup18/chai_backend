import { Router } from "express";
import { loginUser, logoutUser, registerUser , refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(loginUser)

// secured routes  
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken)

export default router;