const Joi = require('joi');
const { ROLES } = require('../utils/constants');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  club: Joi.string().hex().length(24).required(),
  role: Joi.string().valid(ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.VOLUNTEER).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

const createEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().trim().min(10).required(),
  budget: Joi.number().min(0).optional(),
});

const updateEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().trim().min(10).optional(),
  report: Joi.string().trim().optional(),
  budget: Joi.number().min(0).optional(),
});

const changePhaseSchema = Joi.object({
  phase: Joi.string().valid('pre-event', 'during-event', 'post-event').required(),
});

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().trim().min(5).required(),
  event: Joi.string().hex().length(24).required(),
  assignedTo: Joi.string().hex().length(24).required(),
  deadline: Joi.date().iso().greater('now').required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  phase: Joi.string().valid('pre-event', 'during-event', 'post-event').required(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().trim().min(5).optional(),
  assignedTo: Joi.string().hex().length(24).optional(),
  deadline: Joi.date().iso().optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
});

const submissionSchema = Joi.object({
  notes: Joi.string().allow('').optional(),
  media: Joi.array().items(
    Joi.object({
      url: Joi.string().required(),
      fileType: Joi.string().optional(),
      publicId: Joi.string().optional()
    })
  ).optional()
});

const rejectTaskSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(5).required(),
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'sub-admin', 'volunteer').required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createEventSchema,
  updateEventSchema,
  changePhaseSchema,
  createTaskSchema,
  updateTaskSchema,
  submissionSchema,
  rejectTaskSchema,
  updateRoleSchema,
};
