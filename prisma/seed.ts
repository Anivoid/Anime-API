import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Free sample HLS streams for testing
const SAMPLE_STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
  "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
];

function getVideoUrl(animeIndex: number, episodeNumber: number): string {
  return SAMPLE_STREAMS[(animeIndex + episodeNumber) % SAMPLE_STREAMS.length];
}

async function main() {
  console.log("Seeding database...");

  // Create users with roles
  const passwordHash = await bcrypt.hash("password123", 10);
  
  const owner = await prisma.user.create({
    data: {
      name: "Owner",
      username: "owner",
      email: "owner@animevoid.com",
      password: passwordHash,
      bio: "Site owner. Building the void.",
      role: "OWNER",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      username: "admin",
      email: "admin@animevoid.com",
      password: passwordHash,
      bio: "Platform administrator.",
      role: "ADMIN",
    },
  });

  const moderator = await prisma.user.create({
    data: {
      name: "Moderator",
      username: "mod",
      email: "mod@animevoid.com",
      password: passwordHash,
      bio: "Keeping the community safe.",
      role: "MODERATOR",
    },
  });

  const uploader = await prisma.user.create({
    data: {
      name: "Uploader",
      username: "uploader",
      email: "uploader@animevoid.com",
      password: passwordHash,
      bio: "Uploading fresh anime content.",
      role: "UPLOADER",
    },
  });

  const user = await prisma.user.create({
    data: {
      name: "User",
      username: "user",
      email: "user@animevoid.com",
      password: passwordHash,
      bio: "Anime enthusiast.",
      role: "USER",
    },
  });

  console.log(`Created users: Owner, Admin, Moderator, Uploader, User`);

  // Create genres
  const genres = await Promise.all([
    prisma.genre.create({ data: { name: "Action", slug: "action" } }),
    prisma.genre.create({ data: { name: "Adventure", slug: "adventure" } }),
    prisma.genre.create({ data: { name: "Comedy", slug: "comedy" } }),
    prisma.genre.create({ data: { name: "Drama", slug: "drama" } }),
    prisma.genre.create({ data: { name: "Fantasy", slug: "fantasy" } }),
    prisma.genre.create({ data: { name: "Horror", slug: "horror" } }),
    prisma.genre.create({ data: { name: "Mystery", slug: "mystery" } }),
    prisma.genre.create({ data: { name: "Romance", slug: "romance" } }),
    prisma.genre.create({ data: { name: "Sci-Fi", slug: "sci-fi" } }),
    prisma.genre.create({ data: { name: "Slice of Life", slug: "slice-of-life" } }),
    prisma.genre.create({ data: { name: "Sports", slug: "sports" } }),
    prisma.genre.create({ data: { name: "Supernatural", slug: "supernatural" } }),
    prisma.genre.create({ data: { name: "Thriller", slug: "thriller" } }),
    prisma.genre.create({ data: { name: "Mecha", slug: "mecha" } }),
  ]);

  const genreMap = Object.fromEntries(genres.map((g) => [g.slug, g.id]));

  // Create anime
  const animeData = [
    {
      title: "Attack on Titan",
      slug: "attack-on-titan",
      description: "In a world where humanity lives inside cities surrounded by enormous walls due to the Titans, gigantic humanoid creatures who devour humans seemingly without reason.",
      releaseYear: 2013,
      status: "COMPLETED" as const,
      type: "TV" as const,
      season: "Spring" as const,
      rating: 9.0,
      featured: true,
      trending: true,
      genres: ["action", "drama", "fantasy"],
      coverImage: "https://cdn.myanimelist.net/images/anime/10/47347.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
    },
    {
      title: "Demon Slayer",
      slug: "demon-slayer",
      description: "A boy raised by his family joins the Demon Slayer Corps to avenge his family and cure his sister who has been turned into a demon.",
      releaseYear: 2019,
      status: "ONGOING" as const,
      type: "TV" as const,
      season: "Spring" as const,
      rating: 8.5,
      featured: true,
      trending: true,
      genres: ["action", "supernatural"],
      coverImage: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg",
    },
    {
      title: "Jujutsu Kaisen",
      slug: "jujutsu-kaisen",
      description: "A high school boy swallows a cursed talisman and enrolls in a school for Jujutsu Sorcerers to track down the demon's dispersed body parts.",
      releaseYear: 2020,
      status: "ONGOING" as const,
      type: "TV" as const,
      season: "Fall" as const,
      rating: 8.7,
      featured: true,
      trending: true,
      genres: ["action", "supernatural"],
      coverImage: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg",
    },
    {
      title: "My Hero Academia",
      slug: "my-hero-academia",
      description: "A boy born without superpowers in a world where they are the norm dreams of becoming a superhero.",
      releaseYear: 2016,
      status: "ONGOING" as const,
      type: "TV" as const,
      season: "Spring" as const,
      rating: 8.0,
      genres: ["action", "comedy"],
      coverImage: "https://cdn.myanimelist.net/images/anime/10/78745.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/10/78745l.jpg",
    },
    {
      title: "One Piece",
      slug: "one-piece",
      description: "A young pirate with rubber powers sets sail with his crew to find the ultimate treasure, the One Piece.",
      releaseYear: 1999,
      status: "ONGOING" as const,
      type: "TV" as const,
      season: "Fall" as const,
      rating: 9.2,
      genres: ["action", "adventure", "comedy"],
      coverImage: "https://cdn.myanimelist.net/images/anime/6/73245.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/6/73245l.jpg",
    },
    {
      title: "Naruto Shippuden",
      slug: "naruto-shippuden",
      description: "A young ninja seeks recognition from his peers and dreams of becoming the Hokage.",
      releaseYear: 2007,
      status: "COMPLETED" as const,
      type: "TV" as const,
      season: "Winter" as const,
      rating: 8.6,
      genres: ["action", "adventure"],
      coverImage: "https://cdn.myanimelist.net/images/anime/1565/111305.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/1565/111305l.jpg",
    },
    {
      title: "Fullmetal Alchemist: Brotherhood",
      slug: "fullmetal-alchemist-brotherhood",
      description: "Two brothers search for a Philosopher's Stone after an unsuccessful attempt to revive their mother brings them severe consequences.",
      releaseYear: 2009,
      status: "COMPLETED" as const,
      type: "TV" as const,
      season: "Spring" as const,
      rating: 9.1,
      genres: ["action", "adventure", "drama"],
      coverImage: "https://cdn.myanimelist.net/images/anime/1208/94745.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg",
    },
    {
      title: "Steins;Gate",
      slug: "steins-gate",
      description: "A self-proclaimed mad scientist discovers he can send messages to the past, altering the present.",
      releaseYear: 2011,
      status: "COMPLETED" as const,
      type: "TV" as const,
      season: "Spring" as const,
      rating: 9.0,
      genres: ["drama", "sci-fi", "thriller"],
      coverImage: "https://cdn.myanimelist.net/images/anime/5/73199.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/5/73199l.jpg",
    },
    {
      title: "Death Note",
      slug: "death-note",
      description: "A high school student discovers a supernatural notebook that allows him to kill anyone by writing the victim's name while picturing their face.",
      releaseYear: 2006,
      status: "COMPLETED" as const,
      type: "TV" as const,
      season: "Fall" as const,
      rating: 9.0,
      genres: ["drama", "mystery", "thriller"],
      coverImage: "https://cdn.myanimelist.net/images/anime/9/9453.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/9/9453l.jpg",
    },
    {
      title: "Sword Art Online",
      slug: "sword-art-online",
      description: "Players of a virtual reality MMORPG are trapped inside the game and must clear all 100 floors to be freed.",
      releaseYear: 2012,
      status: "COMPLETED" as const,
      type: "TV" as const,
      season: "Summer" as const,
      rating: 7.5,
      genres: ["action", "adventure", "fantasy"],
      coverImage: "https://cdn.myanimelist.net/images/anime/11/39717.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/11/39717l.jpg",
    },
    {
      title: "Spy x Family",
      slug: "spy-x-family",
      description: "A spy, an assassin, and a telepath form a makeshift family, each keeping their true identities secret from each other.",
      releaseYear: 2022,
      status: "ONGOING" as const,
      type: "TV" as const,
      season: "Spring" as const,
      rating: 8.6,
      genres: ["action", "comedy"],
      coverImage: "https://cdn.myanimelist.net/images/anime/1441/139637.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/1441/139637l.jpg",
    },
    {
      title: "Chainsaw Man",
      slug: "chainsaw-man",
      description: "A young man merges with his pet devil and becomes a devil hunter working for a government agency.",
      releaseYear: 2022,
      status: "ONGOING" as const,
      type: "TV" as const,
      season: "Fall" as const,
      rating: 8.5,
      genres: ["action", "supernatural", "horror"],
      coverImage: "https://cdn.myanimelist.net/images/anime/1806/126216.jpg",
      bannerImage: "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg",
    },
  ];

  for (let i = 0; i < animeData.length; i++) {
    const anime = animeData[i];
    const created = await prisma.anime.create({
      data: {
        title: anime.title,
        slug: anime.slug,
        description: anime.description,
        releaseYear: anime.releaseYear,
        status: anime.status,
        type: anime.type,
        rating: anime.rating,
        featured: anime.featured || false,
        trending: anime.trending || false,
        season: anime.season || null,
        coverImage: anime.coverImage,
        bannerImage: anime.bannerImage,
      },
    });

    // Add genres
    for (const genreSlug of anime.genres) {
      const genreId = genreMap[genreSlug];
      if (genreId) {
        await prisma.animeGenre.create({
          data: { animeId: created.id, genreId },
        });
      }
    }

    // Create episodes with video URLs
    const episodeCount = anime.status === "COMPLETED" ? 24 : 12;
    for (let ep = 1; ep <= episodeCount; ep++) {
      await prisma.episode.create({
        data: {
          animeId: created.id,
          number: ep,
          title: `Episode ${ep}`,
          description: `Episode ${ep} of ${anime.title}`,
          duration: 24,
          videoUrl: getVideoUrl(i, ep),
          thumbnail: `/anime/${anime.slug}/ep${ep}.jpg`,
        },
      });
    }

    console.log(`Created ${anime.title} with ${episodeCount} episodes`);
  }

  // Seed banners
  const bannerData = [
    {
      title: "AnimeVoid",
      subtitle: "Enter the Void",
      subtitle2: "Beyond Imagination, Beyond Reality",
      link: "/browse",
      order: 0,
    },
    {
      title: "New Season",
      subtitle: "Spring 2026 Anime",
      link: "/schedule",
      order: 1,
    },
    {
      title: "Top Rated",
      subtitle: "Highest Rated Anime",
      link: "/genres/action",
      order: 2,
    },
  ];

  for (const banner of bannerData) {
    await prisma.banner.create({
      data: {
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="500"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1a0000"/><stop offset="50%" style="stop-color:#8B0000"/><stop offset="100%" style="stop-color:#000"/></linearGradient></defs><rect fill="url(#g)" width="1920" height="500"/><text fill="white" font-family="sans-serif" font-size="72" font-weight="bold" text-anchor="middle" x="960" y="240">${banner.title}</text><text fill="#ccc" font-family="sans-serif" font-size="36" text-anchor="middle" x="960" y="300">${banner.subtitle}</text></svg>`)}`,
        link: banner.link,
        active: true,
        order: banner.order,
      },
    });
  }

  console.log("Seeded 3 banners");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
