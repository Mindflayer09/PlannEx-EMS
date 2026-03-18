const validate = (schema) => {
  return (req, res, next) => {
    const { error , value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      console.log("VALIDATION ERROR:", messages);
      return res.status(400).json({
        success: false,
        message: messages[0],
        errors: messages,
      });
    }
    req.body = value;
    next();
  };
};

module.exports = validate;
