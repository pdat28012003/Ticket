const mongoose = require('mongoose');

const SLA_CONFIG = {
  critical: { initialResponse: 15, resolution: 120 },
  high: { initialResponse: 30, resolution: 240 },
  medium: { initialResponse: 60, resolution: 480 },
  standard: { initialResponse: 120, resolution: 2880 }
};

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  authorRole: String,
  content: { type: String, required: true },
  isInternal: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true },
  requesterName: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  projectTeam: { type: String, required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: {
    type: String, required: true,
    enum: ['environment_setup','deployment','domain_dns_ssl','access_provisioning','port_firewall','backup_restore','incident','cicd_config','other']
  },
  priority: { type: String, required: true, enum: ['critical','high','medium','standard'] },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  targetEnvironment: { type: String, enum: ['production','staging','uat','development','other'] },
  requestedCompletionTime: Date,
  repositoryLink: String,
  relatedLinks: String,
  technicalContact: String,
  envDetails: {
    environmentName: String,
    domain: String,
    techStack: String,
    runCommand: String,
    branch: String,
    technicalDoc: String
  },
  status: {
    type: String,
    enum: ['new','in_progress','waiting_info','resolved','rejected','closed'],
    default: 'new'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToName: String,
  sla: {
    initialResponseDeadline: Date,
    resolutionDeadline: Date,
    initialResponseAt: Date,
    resolvedAt: Date,
    isResponseBreached: { type: Boolean, default: false },
    isResolutionBreached: { type: Boolean, default: false }
  },
  statusHistory: [{
    from: String,
    to: String,
    changedBy: String,
    changedAt: { type: Date, default: Date.now },
    note: String
  }],
  comments: [commentSchema],
  resolutionNote: String,
  closedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ticketSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketId = 'TKT-' + String(count + 1).padStart(5, '0');
    const slaConfig = SLA_CONFIG[this.priority];
    const now = new Date();
    this.sla = {
      initialResponseDeadline: new Date(now.getTime() + slaConfig.initialResponse * 60000),
      resolutionDeadline: new Date(now.getTime() + slaConfig.resolution * 60000),
      isResponseBreached: false,
      isResolutionBreached: false
    };
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
