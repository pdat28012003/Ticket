require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');

async function seed() {
  await connectDB();

  const User = require('./models/User');
  const Ticket = require('./models/Ticket');

  await User.deleteMany({});
  await Ticket.deleteMany({});
  console.log('🗑  Cleared existing data');

  // Create users
  const users = await User.create([
    { fullName: 'Admin System', email: 'admin@company.com', password: await bcrypt.hash('admin123', 12), role: 'admin', team: 'IT Admin' },
    { fullName: 'Nguyễn Văn Dũng', email: 'dung.infra@company.com', password: await bcrypt.hash('infra123', 12), role: 'infra_team', team: 'Infrastructure Team' },
    { fullName: 'Trần Thị Lan', email: 'lan.infra@company.com', password: await bcrypt.hash('infra123', 12), role: 'infra_team', team: 'DevOps Team' },
    { fullName: 'Lê Minh Khoa', email: 'khoa.dev@company.com', password: await bcrypt.hash('project123', 12), role: 'project_team', team: 'Project Alpha' },
    { fullName: 'Phạm Thu Hương', email: 'huong.pm@company.com', password: await bcrypt.hash('project123', 12), role: 'project_team', team: 'Project Beta' },
  ]);
  console.log('👥 Created', users.length, 'users');

  const [admin, infraDung, infraLan, projectKhoa, projectHuong] = users;

  // Create sample tickets
  const now = new Date();

  const tickets = [
    {
      title: 'Setup staging environment for Project Alpha v2.0',
      description: 'Cần setup môi trường staging mới cho Project Alpha phiên bản 2.0. Node.js 20, React 18, MongoDB 7.0.',
      category: 'environment_setup', priority: 'high', status: 'in_progress',
      requester: projectKhoa._id, requesterName: projectKhoa.fullName, requesterEmail: projectKhoa.email, projectTeam: 'Project Alpha',
      targetEnvironment: 'staging', assignedTo: infraDung._id, assignedToName: infraDung.fullName,
      repositoryLink: 'https://github.com/company/project-alpha',
      envDetails: { environmentName: 'staging-alpha-v2', domain: 'staging-v2.alpha.company.com', techStack: 'Node 20, React 18, MongoDB 7', branch: 'develop', runCommand: 'npm install && npm run build && npm start' },
      statusHistory: [{ from: 'new', to: 'in_progress', changedBy: infraDung.fullName, note: 'Đã nhận ticket, đang xử lý' }]
    },
    {
      title: 'SSL certificate renewal for production domain',
      description: 'SSL certificate của domain production sắp hết hạn vào ngày 15/04. Cần gia hạn để tránh downtime.',
      category: 'domain_dns_ssl', priority: 'critical', status: 'new',
      requester: projectHuong._id, requesterName: projectHuong.fullName, requesterEmail: projectHuong.email, projectTeam: 'Project Beta',
      targetEnvironment: 'production', repositoryLink: 'https://beta.company.com',
      statusHistory: []
    },
    {
      title: 'Deploy v1.5.2 hotfix to production',
      description: 'Deploy hotfix build v1.5.2 lên production. Fix critical bug payment gateway timeout.',
      category: 'deployment', priority: 'critical', status: 'resolved',
      requester: projectKhoa._id, requesterName: projectKhoa.fullName, requesterEmail: projectKhoa.email, projectTeam: 'Project Alpha',
      targetEnvironment: 'production', assignedTo: infraLan._id, assignedToName: infraLan.fullName,
      resolutionNote: 'Đã deploy thành công lúc 23:45. Monitoring 30 phút, không có vấn đề.',
      statusHistory: [
        { from: 'new', to: 'in_progress', changedBy: infraLan.fullName, note: 'Bắt đầu deploy' },
        { from: 'in_progress', to: 'resolved', changedBy: infraLan.fullName, note: 'Deploy thành công' }
      ]
    },
    {
      title: 'Mở port 8443 cho API gateway service',
      description: 'Cần mở port 8443 trên server staging cho API gateway service mới. Service chạy trên container docker.',
      category: 'port_firewall', priority: 'medium', status: 'waiting_info',
      requester: projectKhoa._id, requesterName: projectKhoa.fullName, requesterEmail: projectKhoa.email, projectTeam: 'Project Alpha',
      targetEnvironment: 'staging', assignedTo: infraDung._id, assignedToName: infraDung.fullName,
      statusHistory: [
        { from: 'new', to: 'in_progress', changedBy: infraDung.fullName, note: '' },
        { from: 'in_progress', to: 'waiting_info', changedBy: infraDung.fullName, note: 'Cần thêm thông tin: IP source được phép kết nối?' }
      ],
      comments: [{ author: infraDung._id, authorName: infraDung.fullName, authorRole: 'infra_team', content: 'Vui lòng cung cấp danh sách IP source cần whitelist và protocol (TCP/UDP)?', isInternal: false }]
    },
    {
      title: 'Grant DB access for new QA team member',
      description: 'Cần cấp quyền read-only access vào MongoDB staging database cho QA engineer mới: Nguyễn Thị Mai (mai.qa@company.com)',
      category: 'access_provisioning', priority: 'standard', status: 'closed',
      requester: projectHuong._id, requesterName: projectHuong.fullName, requesterEmail: projectHuong.email, projectTeam: 'Project Beta',
      targetEnvironment: 'staging', assignedTo: infraLan._id, assignedToName: infraLan.fullName,
      closedAt: new Date(now.getTime() - 86400000),
      statusHistory: [
        { from: 'new', to: 'in_progress', changedBy: infraLan.fullName, note: '' },
        { from: 'in_progress', to: 'resolved', changedBy: infraLan.fullName, note: 'Đã tạo user read-only' },
        { from: 'resolved', to: 'closed', changedBy: infraLan.fullName, note: 'Confirmed by requester' }
      ]
    }
  ];

  // Adjust createdAt for variety
  const offsets = [3600000 * 2, 3600000 * 5, 86400000 * 3, 3600000 * 1, 86400000 * 7];
  for (let i = 0; i < tickets.length; i++) {
    const t = new Ticket(tickets[i]);
    // Manually set createdAt before save so SLA deadlines are realistic
    await t.save();
  }

  console.log('🎫 Created', tickets.length, 'sample tickets');
  console.log('\n✅ Seed complete!\n');
  console.log('📋 Demo Accounts:');
  console.log('   Admin:        admin@company.com       / admin123');
  console.log('   Infra Team:   dung.infra@company.com  / infra123');
  console.log('   Infra Team:   lan.infra@company.com   / infra123');
  console.log('   Project Team: khoa.dev@company.com    / project123');
  console.log('   Project Team: huong.pm@company.com    / project123');
  console.log('\n🚀 Run: node server.js → http://localhost:3000\n');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
