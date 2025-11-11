/**
 * Cognito PreSignUp Lambda Trigger
 * Auto-confirms users and verifies their email without requiring email verification
 */
exports.handler = async (event) => {
  // Auto-confirm the user and verify their email
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  
  return event;
};

