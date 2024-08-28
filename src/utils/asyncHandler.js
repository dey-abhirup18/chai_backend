const asyncHandler = (requestHandler) => {
     return (req, res, next) => {
          Promise.resolve(requestHandler(req, res, next)).
               catch((err) => next(err))
     }
};

export { asyncHandler };

/*

async (req, res) => {
     res.status(200).json({
          message: "OK"
     })
}

*/

  
// const asyncHandler = (fn) => async (req, res, next) => {
//      try {
//           await fn(req, res, next);
//      } catch (error) {
//           res.status(err.code || 500).json({
//                sucess: true,
//                message: err.message
//           })
//      }
// }