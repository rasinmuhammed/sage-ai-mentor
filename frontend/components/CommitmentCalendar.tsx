'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calendar, CheckCircle, XCircle, Circle, Loader2 } from 'lucide-react' // Added Loader2

// Assuming API_URL is defined elsewhere or replace with actual URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface CommitmentDay {
  date: string // Assuming 'YYYY-MM-DD' or similar parseable format
  commitment: string | null
  shipped: boolean | null // null means pending/not reviewed
  energy: number
}

interface CommitmentCalendarProps {
  githubUsername: string
}

export default function CommitmentCalendar({ githubUsername }: CommitmentCalendarProps) {
  const [days, setDays] = useState<CommitmentDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null); // Added error state

  useEffect(() => {
    loadCalendarData()
  }, [githubUsername])

  const loadCalendarData = async () => {
    setLoading(true);
    setError(null); // Reset error on new load attempt
    try {
      // Fetch last 35 days to potentially fill 5 weeks (7*5)
      const response = await axios.get(`${API_URL}/checkins/${githubUsername}?limit=35`)
      // Sort data by date ascending to fill calendar correctly
      const sortedData = response.data.sort((a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const formatted = sortedData.map((checkin: any) => ({
        date: new Date(checkin.timestamp).toISOString().split('T')[0], // Store as YYYY-MM-DD
        commitment: checkin.commitment,
        shipped: checkin.shipped, // Keep null if not reviewed
        energy: checkin.energy_level
      }));

      // Generate calendar grid (last 28 days shown, aligned to week start if needed)
      const calendarDays = generateCalendarGrid(formatted);
      setDays(calendarDays);

    } catch (error) {
      console.error('Failed to load calendar:', error)
      setError('Could not load calendar data.'); // Set error message
    } finally {
      setLoading(false)
    }
  }

  // Helper function to generate a grid representing the last ~4 weeks
  const generateCalendarGrid = (fetchedDays: CommitmentDay[]) => {
    const grid: (CommitmentDay | { date: string, commitment: null, shipped: null, energy: 0 })[] = [];
    const endDate = new Date();
    // Start 4 weeks before the *end* of the current week to align grid nicely
    const daysSinceSunday = endDate.getDay(); // 0 for Sunday, 6 for Saturday
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - daysSinceSunday - (3 * 7)); // Start 3 full weeks before this Sunday
    startDate.setHours(0, 0, 0, 0);

    const fetchedDaysMap = new Map(fetchedDays.map(d => [d.date, d]));

    for (let i = 0; i < 28; i++) { // Generate exactly 28 days for 4 full weeks
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      if (fetchedDaysMap.has(dateString)) {
        grid.push(fetchedDaysMap.get(dateString)!);
      } else {
        // Add placeholder for days with no data within the range
        grid.push({ date: dateString, commitment: null, shipped: null, energy: 0 });
      }
    }
    return grid;
  };


  // Function to return icon component based on shipped status
  const getDayIcon = (shipped: boolean | null) => {
    if (shipped === true) return <CheckCircle className="w-5 h-5 text-green-400" /> // Kept green
    if (shipped === false) return <XCircle className="w-5 h-5 text-red-400" /> // Kept red
    return <Circle className="w-5 h-5 text-[#FBFAEE]/30" /> // Dimmed Floral White for pending/no data
  }

  // Function to return background based on shipped status for the calendar day square
  const getDayBgClass = (shipped: boolean | null, commitmentExists: boolean) => {
    if (!commitmentExists) return 'bg-[#000000]/30'; // Darker for empty days
    if (shipped === true) return 'bg-green-800/40 hover:bg-green-700/50'; // Green tint
    if (shipped === false) return 'bg-red-800/40 hover:bg-red-700/50'; // Red tint
    return 'bg-[#242424]/60 hover:bg-[#242424]/80'; // Default Raisin Black for pending
  }

  return (
    // Main container: Raisin Black background, Floral White text
    <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6 text-[#FBFAEE]">
      {/* Header */}
      <div className="flex items-center mb-6">
        {/* Icon with Purple Gradient */}
        <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-2 rounded-lg mr-3 shadow-md">
          <Calendar className="w-5 h-5 text-[#FBFAEE]" />
        </div>
        <h3 className="text-xl font-bold text-[#FBFAEE]">Commitment Calendar</h3>
        <span className="ml-2 text-xs text-[#FBFAEE]/60">(Last 4 Weeks)</span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-[#FBFAEE]/70 flex flex-col items-center">
          <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#933DC9]" />
          <span>Loading calendar...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="text-center py-12 text-red-400 flex flex-col items-center">
          <AlertCircle className="w-8 h-8 mb-2" />
          <span>{error}</span>
          <button
            onClick={loadCalendarData}
            className="mt-4 px-4 py-1 bg-[#933DC9] text-[#FBFAEE] rounded-md text-sm hover:bg-[#7d34ad] transition"
          >
            Retry
          </button>
        </div>
      )}


      {/* Calendar Grid */}
      {!loading && !error && days.length > 0 && (
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {/* Optional: Add weekday headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs text-[#FBFAEE]/50 pb-1">{day}</div>
          ))}

          {days.map((day, idx) => {
            const commitmentExists = day.commitment !== null;
            const dateObj = new Date(day.date + 'T00:00:00'); // Ensure correct date parsing

            // Tooltip text
            const tooltip = commitmentExists
              ? `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${day.commitment}`
              : `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: No commitment`;

            return (
              <div
                key={idx}
                className={`aspect-square ${getDayBgClass(day.shipped, commitmentExists)} border border-[#242424]/30 rounded-md flex flex-col items-center justify-center p-1 transition duration-150 group cursor-pointer relative`}
                title={tooltip} // Use native title for simple tooltip
              >
                {/* Day Number */}
                <span className={`text-xs absolute top-1 right-1 ${commitmentExists ? 'text-[#FBFAEE]/60' : 'text-[#FBFAEE]/30'}`}>
                  {dateObj.getDate()}
                </span>
                {/* Icon (only if commitment exists) */}
                {commitmentExists && (
                  <div className="mt-1">
                    {getDayIcon(day.shipped)}
                  </div>
                )}

                {/* Optional: Show energy level visually */}
                {commitmentExists && day.energy > 0 && (
                  <div className="absolute bottom-1 left-1 right-1 h-0.5 rounded-full overflow-hidden bg-[#000000]/30">
                    <div
                      className={`h-full ${day.energy <= 3 ? 'bg-red-500' : day.energy <= 6 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${day.energy * 10}%` }}
                      title={`Energy: ${day.energy}/10`}
                    ></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state after loading */}
      {!loading && !error && days.length === 0 && (
        <div className="text-center py-12 text-[#FBFAEE]/60">
          No commitment data found for the last month.
        </div>
      )}


      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-[#FBFAEE]/70">
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4 text-green-400 mr-1" />
          <span>Shipped</span>
        </div>
        <div className="flex items-center">
          <XCircle className="w-4 h-4 text-red-400 mr-1" />
          <span>Missed</span>
        </div>
        <div className="flex items-center">
          <Circle className="w-4 h-4 text-[#FBFAEE]/30 mr-1" />
          <span>Pending/None</span>
        </div>
        <div className="flex items-center text-xs">
          <span className="w-3 h-1.5 bg-red-500 rounded-l"></span>
          <span className="w-3 h-1.5 bg-yellow-500"></span>
          <span className="w-3 h-1.5 bg-green-500 rounded-r mr-1"></span>
          <span>Energy</span>
        </div>
      </div>
    </div>
  )
}