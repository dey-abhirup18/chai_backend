import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';

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
               // Here, we will allow that user to login who has both the username and the email
               // If we want suppose user who has either username or email can also login then
               //  if (!(username || email))
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

          return res
               .status(200)
               .clearCookie("accessToken", options)
               .clearCookie("refreshToken", options)
               .json(new ApiResponse(200, {}, "User logged Out"))

     }
)

// Refresh the refresh token
const refreshAccessToken = asyncHandler(
     async (req, res) => {
          const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

          if (!incomingRefreshToken) {
               throw new ApiError(401, "unauthorized request");
          }

          try {
               const decodedToken = jwt.verify(
                    incomingRefreshToken,
                    process.env.REFRESH_TOKEN_SECRET
               )

               const user = await User.findById(decodedToken?._id)

               if (!user) {
                    throw new ApiError(401, "Invalid Refresh Token");
               }

               if (incomingRefreshToken !== user?.refreshToken) {
                    throw new ApiError(401, "Refresh token is expired or used");
               }

               const options = {
                    httpOnly: true,
                    secure: true
               }

               const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

               return res
                    .status(200)
                    .cookie("accessToken", accessToken, options)
                    .cookie("refreshToken", newRefreshToken, options)
                    .json(
                         new ApiResponse(200,
                              { accessToken, refreshToken: newRefreshToken },
                              "Access token refreshed"
                         )
                    )
          } catch (error) {
               throw new ApiError(401, error?.message || "Invalid refresh token");
          }
     }
)

// change the current password
const changeCurrentPassword = asyncHandler(
     async (req, res) => {

          const { oldPassword, newPassword } = req.body;

          /*
          const { oldPassword, newPassword, confirmPassword } = req.body;
          if (!(newPassword === confirmPassword)) {
               return new ApiError(400, "Password doesn'match with the entered password")
          }
          */

          const user = await User.findById(req.user._id);
          const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

          // check the old password entered correct or not
          if (!isPasswordCorrect) {
               throw new ApiError(400, "Invalid Old Password");
          }

          // set the new password
          user.password = newPassword;
          await user.save({ validateBeforeSave: false });

          return res
               .status(200)
               .json(
                    new ApiResponse(200, {}, "Password changed successfully")
               )
     }
)

// get the current user
const getCurrentUser = asyncHandler(
     async (req, res) => {
          return res
               .status(200)
               .json(200, req.user, "current user fetched successfully");
     }
);

// update the acount details
const updateAccountDetails = asyncHandler(

     async (req, res) => {
          const { fullname, email } = req.body;

          if (!fullname || !email) {
               throw new ApiError(400, "All fields are required")
          }

          const user = User.findByIdAndUpdate(            // await
               req.user?._id, //
               {
                    $set: {
                         fullname,
                         email
                    }
               },
               { new: true }
          ).select("-password")

          return res
               .status(200)
               .json(
                    new ApiResponse(200, user, "Account details updated successfully")
               )

     }

);

// update the files uploaded
const updateUserAvatar = asyncHandler(

     async (req, res) => {
          const avatarLocalPath = req.file?.path;

          if (!avatarLocalPath) {
               throw new ApiError(400, "Avatar file is missing");
          }

          const avatar = await uploadOnCloudinary(avatarLocalPath); // URL Link from cloudinary

          if (!avatar.url) {
               throw new ApiError(400, "Error while uploading on avatar");
          }

          const user = await User.findByIdAndUpdate(
               req.user?._id,
               {
                    $set: {
                         avatar: avatar.url
                    }
               },
               { new: true }
          ).select("-password");

          return res
               .status(200)
               .json(
                    new ApiResponse(200, user, "Avatar Image updated successfully")
               )

     }

)

// update the files uploaded
const updateUserCoverImage = asyncHandler(

     async (req, res) => {
          const coverImageLocalPath = req.file?.path;

          if (!coverImageLocalPath) {
               throw new ApiError(400, "Cover Image File file is missing");
          }

          const coverImage = await uploadOnCloudinary(coverImageLocalPath); // URL Link from cloudinary

          if (!coverImage.url) {
               throw new ApiError(400, "Error while uploading on cover image");
          }

          const user = await User.findByIdAndUpdate(
               req.user?._id,
               {
                    $set: {
                         coverImage: coverImage.url
                    }
               },
               { new: true }
          ).select("-password");

          return res
               .status(200)
               .json(
                    new ApiResponse(200, user, "Cover Image updated successfully")
               )
     }

)

export {
     registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage
};        