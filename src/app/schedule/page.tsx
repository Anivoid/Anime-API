"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";

interface ScheduleEntry {
  animeTitle: string;
  slug: string;
  episodeNumber: number;
  airTime: string;
  airDay: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

export default function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    return DAYS[today === 0 ? 6 : today - 1];
  });
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((data) => {
        setSchedule(data.schedule || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredSchedule = schedule.filter((s) => s.airDay === selectedDay);

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Schedule</h1>
        <p className="text-gray-500 text-sm mb-6">Weekly anime release schedule</p>

        {/* Day selector */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 px-6 py-3 rounded-lg text-center transition-all ${
                selectedDay === day
                  ? "bg-purple-600 text-white"
                  : "bg-[#1a1a2e] text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <div className="text-xs uppercase tracking-wider opacity-70">{day}</div>
              <div className="text-lg font-bold">{FULL_DAYS[day].slice(0, 3)}</div>
            </button>
          ))}
        </div>

        {/* Schedule list */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 bg-[#1a1a2e] rounded-lg p-4 animate-pulse">
                <div className="w-16 h-3 bg-white/5 rounded" />
                <div className="w-12 h-16 bg-white/5 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-1/3" />
                  <div className="h-3 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSchedule.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No anime scheduled for {FULL_DAYS[selectedDay]}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSchedule.map((entry, i) => (
              <Link
                key={i}
                href={`/watch/${entry.slug}/${entry.episodeNumber}`}
                className="flex items-center gap-4 bg-[#1a1a2e] border border-white/5 rounded-lg p-4 hover:border-purple-500/30 hover:bg-white/5 transition-all group"
              >
                <span className="text-sm text-gray-500 w-16 font-mono">{entry.airTime}</span>
                <div className="w-12 h-16 rounded overflow-hidden bg-white/5 flex-shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-[#1a1a2e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-200 group-hover:text-purple-400 transition-colors">
                    {entry.animeTitle}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">Episode {entry.episodeNumber}</p>
                </div>
                <span className="text-xs bg-purple-600/20 text-purple-400 px-3 py-1.5 rounded font-medium group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>▶</span> Watch
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
