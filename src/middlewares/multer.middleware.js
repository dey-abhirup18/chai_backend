import multer from "multer";

const storage = multer.diskStorage({
     destination: function (req, file, cb) {
          // file location
          cb(null, "./public/temp")
     },
     // file name that will be stored in the web server
     filename: function (req, file, cb) {
          cb(null, file.originalname)
     }
})

export const upload = multer({
     storage,
})