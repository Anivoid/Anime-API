"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const ANILIST_URL = "https://graphql.anilist.co";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ScheduleEntry {
  animeTitle: string;
  slug: string;
  episodeNumber: number;
  airTime: string;
  airDay: string;
}

async function fetchSchedule(): Promise<ScheduleEntry[]> {
  const now = Math.floor(Date.now() / 1000);
  const weekLater = now + 7 * 24 * 60 * 60;
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const query = `query {
    Page(page: 1, perPage: 50) {
      media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
        id
        title { romaji english }
        airingSchedule(notYetAired: true, page: 1, perPage: 7) {
          nodes { episode airingAt }
        }
      }
    }
  }`;
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const media = data?.data?.Page?.media || [];
  const schedule: ScheduleEntry[] = [];
  for (const m of media) {
    const title = m.title as { romaji: string; english: string | null };
    const name = title.english || title.romaji;
    const nodes = m.airingSchedule?.nodes || [];
    for (const node of nodes) {
      if (node.airingAt >= now && node.airingAt <= weekLater) {
        const date = new Date(node.airingAt * 1000);
        const dayIdx = date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1;
        const time = date.toUTCString().slice(17, 22);
        schedule.push({
          animeTitle: name,
          slug: `anilist-${m.id}`,
          episodeNumber: node.episode,
          airTime: time,
          airDay: DAYS[dayIdx],
        });
      }
    }
  }
  schedule.sort((a, b) => a.airTime.localeCompare(b.airTime));
  return schedule;
}

export function ScheduleWidget() {
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().getDay();
    setSelectedDay(DAYS[today === 0 ? 6 : today - 1]);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSchedule()
      .then(setSchedule)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredSchedule = schedule.filter((s) => s.airDay === selectedDay);

  return (
    <div className="bg-[#1a1a2e] rounded-lg border border-white/5 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-lg font-bold text-white">Estimated Schedule</h3>
      </div>

      <div className="flex px-2 gap-1 overflow-x-auto">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`flex-1 min-w-[40px] py-2 rounded text-center transition-colors ${
              selectedDay === day
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <div className="text-[10px] uppercase">{day}</div>
          </button>
        ))}
      </div>

      <div className="px-4 py-3 min-h-[150px]">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-14 h-3 bg-white/5 rounded" />
                <div className="flex-1 h-3 bg-white/5 rounded" />
                <div className="w-20 h-6 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : filteredSchedule.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No anime scheduled</p>
        ) : (
          <div className="space-y-2">
            {filteredSchedule.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <span className="text-xs text-gray-500 w-14 font-mono">{entry.airTime}</span>
                <span className="text-sm text-gray-300 flex-1 group-hover:text-purple-400 transition-colors truncate">
                  {entry.animeTitle}
                </span>
                <Link
                  href={`/anime/${entry.slug}`}
                  className="text-[11px] bg-white/5 hover:bg-purple-600 text-gray-300 hover:text-white px-2 py-1 rounded transition-colors flex-shrink-0"
                >
                  Ep {entry.episodeNumber}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
