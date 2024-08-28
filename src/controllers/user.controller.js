import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(
     async (req, res, next) => {

          // Steps  --
          // get user details from frontend --
          // validation - not empty --
          //  check if user already exists: username and email --
          // check for images, check for avatar --
          // upload them to cloudinary, avatar --
          // Create user Object - create entry in db  --
          // remove password and refresh token field from response --
          // check for user creation --
          // return response --

          // 1. get user details from frontend 
          const { fullname, email, username, password } = req.body;
          console.log("email: ", email);

          // Validation
          if (
               [fullname, email, username, password].some((field) => field?.trim() === "")
          ) {
               throw new ApiError(400, "All fields are required")
          }

          // check if the user already exists in the database
          const existedUser = User.findOne({
               $or: [{ username }, { email }]
          })

          if (existedUser) {
               throw new ApiError(409, "User with email or username already exists")
          }

          // check for images or files
          const avatarLocalPath = req.files?.avatar[0]?.path;
          const coverImageLocalPath = req.files?.coverImage[0]?.path;

          if (!avatarLocalPath) {
               throw new ApiError(400, "Avatar file is required")
          }

          // upload on cloudinary
          const avatar = await uploadOnCloudinary(avatarLocalPath);  // This will give the URL Link to be added in the databse
          const coverImage = await uploadOnCloudinary(coverImageLocalPath);  // This will give the URL Link to be added in the databse

          // Check if avatar if added or not
          if (!avatar) {
               throw new ApiError(400, "Avatar file is required");
          }

          // Create an User Object to be added in the database
          const user = await User.create({
               fullname,
               avatar: avatar.url,
               coverImage: coverImage?.url || "",
               email,
               password,
               username: username.toLowerCase()
          })

          // To check whether the entry is made in the User model or not
          const createdUser = await User.findById(user._id).select(
               "-password -refreshToken"
          )

          // remove the password and refreshToken
          if (!createdUser) {
               throw new ApiError(500, "Something went wrong while registering the user");
          }

          // Creating the response
          return res.status(201).json(
               new ApiResponse(200, createdUser, "User registered Succesfully")
          )

     }
);

export { registerUser };        