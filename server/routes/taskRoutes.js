const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { 
  createTaskSchema, 
  updateTaskSchema, 
  submissionSchema, 
  rejectTaskSchema 
} = require('../utils/validators');

router.use(authenticate);
router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);

router.post('/', authorizeRoles('admin', 'super_admin'), validate(createTaskSchema), taskController.createTask);
router.put('/:id', authorizeRoles('admin', 'super_admin'), validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', authorizeRoles('admin', 'super_admin'), taskController.deleteTask);

// 'protect' removed because router.use(authenticate) already handles it!
router.post('/:id/submit', validate(submissionSchema), taskController.submitTask);

router.patch('/:id/approve', authorizeRoles('admin', 'super_admin'), taskController.approveTask);
router.patch('/:id/reject', authorizeRoles('admin', 'super_admin'), validate(rejectTaskSchema), taskController.rejectTask);

module.exports = router;