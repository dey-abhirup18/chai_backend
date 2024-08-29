import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
     try {
          const user = await User.findById(userId);
          const accessToken = user.generateAccessToken(); // we will give this to the user via cookies
          const refreshToken = user.generateRefreshToken();

          // Adding the refresh Token to be stored in the database
          user.refreshToken = refreshToken;
          await user.save({ validateBeforeSave: false });

          return { accessToken, refreshToken };

     } catch (error) {
          throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
     }
}

// Register the User
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
          // console.log("email: ", email);

          // Validation
          if (
               [fullname, email, username, password].some((field) => field?.trim() === "")
          ) {
               throw new ApiError(400, "All fields are required")
          }

          // check if the user already exists in the database
          const existedUser = await User.findOne({
               $or: [{ username }, { email }]
          })

          if (existedUser) {
               throw new ApiError(409, "User with email or username already exists")
          }

          // console.log(req.files);

          // check for images or files
          const avatarLocalPath = req.files?.avatar[0]?.path;
          // const coverImageLocalPath = req.files?.coverImage[0]?.path;

          let coverImageLocalPath;
          if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
               coverImageLocalPath = req.files.coverImage[0].path
          }

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

// Log In the User
const loginUser = asyncHandler(
     async (req, res) => {

          // -- req -> Body  (get the log in data from the user)
          // username or email (we have to log in the user through the mail or username both )
          // find the user (find the user from the database)
          // password check (check the password from the user)
          // after password is checked
          // generate access and refresh tokens
          // send the tokens in the cookies and these cookies are safe 

          // Take the data from the user
          const { email, username, password } = req.body;

          // Check the login through both email and username
          if (!username && !email) {
               throw new ApiError(400, "username or email is required");
          }

          // findOne finds the first entry in the MongoDB and returns it
          const user = await User.findOne({
               $or: [{ username }, { email }]
          })

          if (!user) {
               throw new ApiError(404, "User does not exist");
          }

          // Password check if user is found and here this user is the user that we have got from the database of MongoDB
          const isPasswordValid = await user.isPasswordCorrect(password);

          if (!isPasswordValid) {
               throw new ApiError(401, "Invalid user credentials");
          }

          // make the access and refresh token
          const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

          // Send these tokens in the cookies 
          const loggedInUser = await User.findById(user._id).
               select("-password -refreshToken")

          // send the cookies
          const options = {
               httpOnly: true,
               secure: true
          }

          return res.
               status(200)
               .cookie("accessToken", accessToken, options)
               .cookie("refreshToken", refreshToken, options)
               .json(
                    new ApiResponse(
                         200,
                         {
                              user: loggedInUser, accessToken,
                              refreshToken
                         },
                         "User logged In Successfully"
                    )
               )
     }
);

// Log Out the User
const logoutUser = asyncHandler(
     async (req, res) => {

          await User.findByIdAndUpdate(
               req.user._id,
               {
                    $set: {
                         refreshToken: undefined
                    }
               },
               {
                    new: true
               }
          )

          const options = {
               httpOnly: true,
               secure: true
          }

          return  res
          .status(200)
          .clearCookie("accessToken", options)
          .clearCookie("refreshToken", options)
          .json(new ApiResponse(200 , {} , "User logged Out"))

     }
)

export {
     registerUser,
     loginUser,
     logoutUser
};        