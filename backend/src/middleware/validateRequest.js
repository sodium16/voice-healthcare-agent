// Optional: Validation middleware if needed
const { API_CONTRACT, HTTP_STATUS } = require('../config/constants');

function validateAskRequest(req, res, next) {
  const { user_id, query } = req.body;
  
  if (!user_id || !query) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Missing required fields',
      required: API_CONTRACT.ASK_REQUEST.required
    });
  }
  
  next();
}

module.exports = { validateAskRequest };