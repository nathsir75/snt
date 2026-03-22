import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.branch.createMany({
    data: [
      {
        name: 'SNT Education Delhi',
        code: 'DELHI',
        subdomain: 'delhi',
        city: 'Delhi',
        state: 'Delhi',
        status: 'active',
        isPublic: true,
        websiteEnabled: true,
        publicPriority: 10,
        publicPhone: '+91 9876543201',
        publicEmail: 'delhi@snteducation.com',
        shortDescription: 'Our flagship Delhi centre at Connaught Place.',
      },
      {
        name: 'SNT Education Navi Mumbai',
        code: 'NAVIMUMBAI',
        subdomain: 'navimumbai',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        status: 'active',
        isPublic: true,
        websiteEnabled: true,
        publicPriority: 9,
        publicPhone: '+91 9876543202',
        publicEmail: 'navimumbai@snteducation.com',
        shortDescription: 'Serving Navi Mumbai from Vashi.',
      },
      {
        name: 'SNT Education Rudauli',
        code: 'RUDAULI',
        subdomain: 'rudauli',
        city: 'Rudauli',
        state: 'Uttar Pradesh',
        status: 'active',
        isPublic: true,
        websiteEnabled: true,
        publicPriority: 7,
        publicPhone: '+91 9876543203',
        publicEmail: 'rudauli@snteducation.com',
        shortDescription: 'Rudauli centre, Ayodhya District, UP.',
      },
      {
        name: 'SNT Education Ghazipur',
        code: 'GHAZIPUR',
        subdomain: 'ghazipur',
        city: 'Ghazipur',
        state: 'Uttar Pradesh',
        status: 'active',
        isPublic: true,
        websiteEnabled: true,
        publicPriority: 7,
        publicPhone: '+91 9876543204',
        publicEmail: 'ghazipur@snteducation.com',
        shortDescription: 'Ghazipur City centre, Eastern UP.',
      },
      {
        name: 'SNT Education Solapur',
        code: 'SOLAPUR',
        subdomain: 'solapur',
        city: 'Solapur',
        state: 'Maharashtra',
        status: 'active',
        isPublic: true,
        websiteEnabled: true,
        publicPriority: 8,
        publicPhone: '+91 9876543205',
        publicEmail: 'solapur@snteducation.com',
        shortDescription: 'Solapur City centre, Maharashtra.',
      },
      {
        name: 'SNT Education Pune',
        code: 'PUNE',
        subdomain: 'pune',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'active',
        isPublic: true,
        websiteEnabled: true,
        publicPriority: 9,
        publicPhone: '+91 9876543206',
        publicEmail: 'pune@snteducation.com',
        shortDescription: 'Shivajinagar, Pune — our Maharashtra hub.',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Branch seed completed — 6 branches inserted (duplicates skipped)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
