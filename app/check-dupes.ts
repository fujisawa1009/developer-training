import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(async () => {
  const templates = await prisma.checklistTemplate.findMany({ select: { id: true, name: true, _count: { select: { categories: true } } } });
  console.log('=== ChecklistTemplates ===');
  console.log(JSON.stringify(templates, null, 2));
  
  const plans = await prisma.curriculumPlan.findMany({ select: { id: true, name: true, _count: { select: { items: true } } } });
  console.log('\n=== CurriculumPlans ===');
  console.log(JSON.stringify(plans, null, 2));
  
  const curricula = await prisma.curriculum.findMany({ select: { id: true, slug: true, name: true, _count: { select: { lessons: true } } } });
  console.log('\n=== Curricula ===');
  console.log(JSON.stringify(curricula, null, 2));
  
  const assignments = await prisma.assignment.findMany({ select: { id: true, title: true, type: true } });
  console.log('\n=== Assignments (total: ' + assignments.length + ') ===');
  console.log(JSON.stringify(assignments.slice(0, 10), null, 2));
  
  await prisma.$disconnect();
})();
