const express = require('express');
const Ticket = require('../models/Ticket');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const ticketData = {
      ...req.body,
      requester: req.user._id,
      requesterName: req.body.requesterName || req.user.fullName,
      requesterEmail: req.body.requesterEmail || req.user.email,
      projectTeam: req.body.projectTeam || req.user.team
    };
    const ticket = new Ticket(ticketData);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, category, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.role === 'project_team') filter.requester = req.user._id;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { ticketId: { $regex: search, $options: 'i' } }
    ];
    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('requester', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const now = new Date();
    const updatedTickets = tickets.map(t => {
      const obj = t.toObject();
      obj.slaStatus = getSLAStatus(obj, now);
      return obj;
    });
    res.json({ tickets: updatedTickets, total, pages: Math.ceil(total / limit), current: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const matchFilter = req.user.role === 'project_team' ? { requester: req.user._id } : {};
    const [statusStats, priorityStats, categoryStats, slaBreached, recentTickets] = await Promise.all([
      Ticket.aggregate([{ $match: matchFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $match: matchFilter }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $match: matchFilter }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Ticket.countDocuments({ ...matchFilter, status: { $nin: ['closed','resolved'] }, 'sla.resolutionDeadline': { $lt: new Date() } }),
      Ticket.find(matchFilter).sort({ createdAt: -1 }).limit(5).select('ticketId title status priority createdAt sla')
    ]);
    const total = await Ticket.countDocuments(matchFilter);
    res.json({ statusStats, priorityStats, categoryStats, slaBreached, recentTickets, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { ticketId: req.params.id }] })
      .populate('requester', 'fullName email role')
      .populate('assignedTo', 'fullName email role');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const obj = ticket.toObject();
    obj.slaStatus = getSLAStatus(obj, new Date());
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', auth, requireRole('infra_team', 'admin'), async (req, res) => {
  try {
    const { status, note, assignedTo, assignedToName, resolutionNote } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const prevStatus = ticket.status;
    ticket.status = status;
    if (assignedTo) { ticket.assignedTo = assignedTo; ticket.assignedToName = assignedToName; }
    if (resolutionNote) ticket.resolutionNote = resolutionNote;
    if (status === 'in_progress' && !ticket.sla.initialResponseAt) ticket.sla.initialResponseAt = new Date();
    if (['resolved','closed'].includes(status) && !ticket.sla.resolvedAt) { ticket.sla.resolvedAt = new Date(); ticket.closedAt = new Date(); }
    ticket.statusHistory.push({ from: prevStatus, to: status, changedBy: req.user.fullName, note: note || '' });
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content, isInternal } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.comments.push({
      author: req.user._id,
      authorName: req.user.fullName,
      authorRole: req.user.role,
      content,
      isInternal: req.user.role !== 'project_team' && isInternal
    });
    await ticket.save();
    res.json(ticket.comments[ticket.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getSLAStatus(ticket, now) {
  const deadline = new Date(ticket.sla?.resolutionDeadline);
  const created = new Date(ticket.createdAt);
  if (!deadline) return { status: 'unknown', label: 'N/A', percent: 0 };
  if (['closed','resolved'].includes(ticket.status)) return { status: 'done', label: 'Completed', percent: 100 };
  const timeLeft = deadline - now;
  const totalTime = deadline - created;
  const percent = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  if (timeLeft < 0) return { status: 'breached', label: 'SLA Breached', percent: 0 };
  if (percent < 20) return { status: 'at_risk', label: 'At Risk', percent };
  return { status: 'on_track', label: 'On Track', percent };
}

module.exports = router;
