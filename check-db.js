const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const totalAnime = await prisma.anime.count();
  const totalEpisodes = await prisma.episode.count();
  const ongoing = await prisma.anime.count({ where: { status: 'ONGOING' } });
  const completed = await prisma.anime.count({ where: { status: 'COMPLETED' } });
  const upcoming = await prisma.anime.count({ where: { status: 'UPCOMING' } });
  const epsPerAnime = await prisma.$queryRaw`SELECT COUNT(*) as cnt, animeId FROM Episode GROUP BY animeId ORDER BY cnt DESC LIMIT 10`;
  const sampleAnime = await prisma.anime.findMany({ take: 5, orderBy: { releaseYear: 'desc' }, select: { title: true, status: true, releaseYear: true, subCount: true, dubCount: true, slug: true } });
  const sampleEps = await prisma.episode.findMany({ take: 5, include: { anime: { select: { title: true, slug: true } } } });
  console.log('Total anime:', totalAnime);
  console.log('Total episodes:', totalEpisodes);
  console.log('Ongoing:', ongoing, 'Completed:', completed, 'Upcoming:', upcoming);
  console.log('Episodes per anime:', JSON.stringify(epsPerAnime));
  console.log('Sample anime:', JSON.stringify(sampleAnime, null, 2));
  console.log('Sample episodes:', JSON.stringify(sampleEps, null, 2));
  await prisma.$disconnect();
})();
