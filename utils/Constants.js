const SERVER_URL = "https://square-immune-hound.ngrok-free.app";
// const SERVER_URL = "https://77a8-125-99-173-186.ngrok-free.app";

const errorMessage = { otpRetryExceeded: "Maximum OTP retry limit is exceeded!", account404: "Account is not exist in our record!", wrongOTP: "Incorrect PIN Entered!", blockedAccount: "This account is blocked! Please contact our support for unblock it.", uploadFile: "Please upload a file", positionError: "Failed to send! Can't measure current location.", common: "Something went wrong, Try again later.", mobileInput: "Invalid mobile number!", invalidOTP: "Invalid OTP!", invalidAction: "Invalid action!", otpSentExceeded: "You have already sent multiple OTP request! Wait for 10 minutes for next request.", }

module.exports = { SERVER_URL, errorMessage };