const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, submissionSchema, rejectTaskSchema } = require('../utils/validators');

router.use(authenticate);

router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', requireRole('admin', 'sub-admin'), validate(createTaskSchema), taskController.createTask);
router.put('/:id', requireRole('admin', 'sub-admin'), validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', requireRole('admin', 'sub-admin'), taskController.deleteTask);
router.post('/:id/submit', protect, validate(submissionSchema), taskController.submitTask);
router.patch('/:id/approve', requireRole('admin', 'sub-admin'), taskController.approveTask);
router.patch('/:id/reject', requireRole('admin', 'sub-admin'), validate(rejectTaskSchema), taskController.rejectTask);

module.exports = router;
