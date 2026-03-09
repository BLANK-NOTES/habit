const isHabitActiveOnDay = (habit, date) => {
  if (!habit.schedule) return true;

  const { type } = habit.schedule;

  if (type === "daily") return true;

  if (type === "weekdays") {
    const day = date.getDay(); // 0=Sun
    return habit.schedule.days.includes(day);
  }

  if (type === "interval") {
    const start = new Date(habit.schedule.startDate);
    const diffDays = Math.floor(
      (date - start) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 0 && diffDays % habit.schedule.interval === 0;
  }

  return false;
};
