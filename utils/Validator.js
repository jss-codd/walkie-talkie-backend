const Yup = require("yup");

const phoneRegExp =
  /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;

const adminLogin = Yup.object({
email: Yup.string()
    .trim()
    .email("Invalid email address")
    .required("Email is required"),
password: Yup.string()
    .trim()
    .required("Password is required")
    .max(20, "Password must be 20 characters or less")
    .min(6, "Password must be 6 characters or more"),
});

const validator = {
    adminLogin
};

module.exports = validator;
