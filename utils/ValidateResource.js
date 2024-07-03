const validateResource = (resourceSchema) => async (req, res, next) => {
    const resource = req.body;
    try {
      // throws an error if not valid
      const validData = await resourceSchema.validate(resource);
      req.body = validData;
      next();
    } catch (e) {
      console.error(e);
      res.status(400).json({ res: false, message: e.errors.join(", ") });
    }
  };
  
  module.exports = validateResource;  