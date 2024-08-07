const SERVER_URL = "https://current-fish-manually.ngrok-free.app";
// const SERVER_URL = "https://77a8-125-99-173-186.ngrok-free.app";

const errorMessage = { otpRetryExceeded: "Maximum OTP retry limit is exceeded!", account404: "The account does not exist in our records.", wrongOTP: "Incorrect PIN entered. Please try again.", blockedAccount: "This account is blocked! Please contact our support team to unblock it.", uploadFile: "Please upload a file", positionError: "Failed to send! Can't measure current location.", common: "Something went wrong, Try again later.", mobileInput: "Invalid mobile number!", invalidOTP: "The OTP you entered does not match our records. Please try again.", invalidPIN: "The PIN you entered is invalid. Please try again.", invalidAction: "Invalid action!", otpSentExceeded: "You have already sent multiple OTP requests! Please wait 10 minutes before making another request.", }

const pinRetryCount = 5;

module.exports = { SERVER_URL, errorMessage, pinRetryCount };