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

const profileDetails = Yup.object({
    email: Yup.string()
        .trim()
        .email("Invalid email address")
        .required("Email is required"),
    name: Yup.string()
        .trim()
        .required("Name is required")
        .max(25, "Name must be 25 characters or less")
        .min(4, "Name must be 4 characters or more"),
    location: Yup.string()
        .trim()
        .required("Location is required")
        .max(25, "Location must be 25 characters or less")
        .min(4, "Location must be 4 characters or more"),
});

const deviceToken = Yup.object({
    token: Yup.string()
        .trim()
        .required("Token is required")
});

const saveLocation = Yup.object({
    latitude: Yup.string()
        .trim()
        .required("Latitude is required"),
    longitude: Yup.string()
        .trim()
        .required("Longitude is required"),
    heading: Yup.string()
        .trim()
});

const audioPlayStatus = Yup.object({
    status: Yup.boolean()
        .required("Status is required")
});

const notificationStatus = Yup.object({
    status: Yup.boolean()
        .required("Status is required")
});

const mobileVerification = Yup.object({
    mobile: Yup.string()
        .trim()
        .required("Mobile is required"),
    countryCode: Yup.string()
        .trim()
        .required("Country code is required"),
    callingCode: Yup.string()
        .trim()
        .required("Calling code is required"),
});

const otpVerification = Yup.object({
    mobile: Yup.string()
        .trim()
        .required("Mobile is required"),
    otp: Yup.number()
        .required("OTP is required")
});

const pinSet = Yup.object({
    pin: Yup.number()
        .required("PIN is required")
});

const pinLogin = Yup.object({
    mobile: Yup.string()
        .trim()
        .required("Mobile is required"),
    pin: Yup.number()
        .required("PIN is required")
});

const createChannel = Yup.object({
    startingValue: Yup.object().shape({
        formatted_address: Yup.string().trim().required("Starting location required"),
        place_id: Yup.string().trim().required("Starting location required"),
    }),
    
    destinationValue: Yup.object().shape({
        formatted_address: Yup.string().trim().required("Starting location required"),
        place_id: Yup.string().trim().required("Starting location required"),
    }),
});

const emailSubmit = Yup.object({
    email: Yup.string()
        .trim()
        .email("Invalid email address")
        .required("Email is required")
});

const locationSubmit = Yup.object({
    location: Yup.string()
        .trim()
        .required("Location is required")
        .max(25, "Location must be 25 characters or less")
        .min(4, "Location must be 4 characters or more")
});

const nameSubmit = Yup.object({
    name: Yup.string()
        .trim()
        .required("Name is required")
        .max(25, "Name must be 25 characters or less")
        .min(4, "Name must be 4 characters or more"),
});

const validator = {
    adminLogin,
    profileDetails,
    deviceToken,
    saveLocation,
    audioPlayStatus,
    notificationStatus,
    mobileVerification,
    otpVerification,
    pinSet,
    pinLogin,
    createChannel,
    emailSubmit,
    locationSubmit,
    nameSubmit
};

module.exports = validator;
