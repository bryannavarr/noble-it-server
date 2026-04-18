const Joi = require("joi");

const contactUsSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  message: Joi.string().trim().max(2000).required(),
});

const onDemandSupportSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().max(20).optional().allow(""),
  company: Joi.string().trim().max(100).optional().allow(""),
  message: Joi.string().trim().max(2000).required(),
});

const startProjectSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().email().required(),
  company: Joi.string().trim().max(100).optional().allow(""),
  message: Joi.string().trim().max(2000).required(),
  architecture: Joi.array().items(Joi.string().trim()).optional(),
});

const consultationSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().max(20).optional().allow(""),
  company: Joi.string().trim().max(100).optional().allow(""),
  source: Joi.string().trim().optional().allow(""),
});

module.exports = {
  contactUsSchema,
  onDemandSupportSchema,
  startProjectSchema,
  consultationSchema,
};
