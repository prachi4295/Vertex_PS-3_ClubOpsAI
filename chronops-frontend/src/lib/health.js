import { timeToMinutes, calculateDelayMinutes, detectTimingClashes } from "./time";

/**
 * Named constants for Risk Score thresholds and calculations.
 */
export const RISK_THRESHOLDS = {
  LOW_MAX: 2,
  MEDIUM_MAX: 5,
};

export const DELAY_THRESHOLDS = {
  LOW: 5,
  HIGH: 15,
};

export const RISK_POINTS = {
  OVERDUE_TASK: 2,
  UNASSIGNED_TASK: 1,
  DELAY_HIGH: 2,
  DELAY_LOW: 1,
  TIMING_CLASH: 3,
};

/**
 * Calculates Task Completion percentage.
 * Formula: done tasks / all tasks (0 if none).
 *
 * @param {Array} tasks
 * @returns {number} percentage 0 - 100 (rounded)
 */
export function calculateTaskCompletion(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  return Math.round((doneTasks / tasks.length) * 100);
}

/**
 * Calculates Volunteer Allocation percentage.
 * Formula: non-done tasks with an assignee / non-done tasks.
 * Returns 100 if all tasks are already done, or 0 if no tasks exist.
 *
 * @param {Array} tasks
 * @returns {number} percentage 0 - 100 (rounded)
 */
export function calculateVolunteerAllocation(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;
  const nonDoneTasks = tasks.filter((t) => t.status !== "done");
  if (nonDoneTasks.length === 0) return 100;

  const assignedNonDone = nonDoneTasks.filter(
    (t) => typeof t.assignee === "string" && t.assignee.trim().length > 0
  ).length;

  return Math.round((assignedNonDone / nonDoneTasks.length) * 100);
}

/**
 * Calculates current schedule delay in minutes.
 * Formula: startTime minus plannedStart of the live session,
 * or of the next upcoming session if none is live; 0 if there are no sessions.
 *
 * @param {Array} sessions
 * @returns {number} delay in minutes (>= 0)
 */
export function calculateCurrentDelay(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;

  // 1. Check for active 'live' session
  const liveSession = sessions.find((s) => s.status === "live");
  if (liveSession) {
    return calculateDelayMinutes(liveSession.startTime, liveSession.plannedStart);
  }

  // 2. Otherwise check for next 'upcoming' session (by order or startTime)
  const sortedUpcoming = [...sessions]
    .filter((s) => s.status === "upcoming")
    .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.startTime || "").localeCompare(b.startTime || ""));

  if (sortedUpcoming.length > 0) {
    const nextSession = sortedUpcoming[0];
    return calculateDelayMinutes(nextSession.startTime, nextSession.plannedStart);
  }

  return 0;
}

/**
 * Determines whether a task is overdue.
 * A task is overdue if it is not done and its dueDate is in the past.
 *
 * @param {object} task
 * @param {Date|string} [now]
 * @returns {boolean}
 */
export function isTaskOverdue(task, now = new Date()) {
  if (!task || task.status === "done" || !task.dueDate) return false;
  const referenceDate = now instanceof Date ? now : new Date(now);
  const taskDueDate = task.dueDate.toDate
    ? task.dueDate.toDate()
    : new Date(task.dueDate);
  return taskDueDate < referenceDate;
}

/**
 * Calculates the Risk Score and categorizes into Low, Medium, or High.
 * Formula:
 * - 2 per overdue non-done task
 * - 1 per unassigned non-done task
 * - schedule delay points (2 if delay >= 15 min, 1 if delay >= 5 min)
 *
 * Thresholds:
 * - Low: 0 - 2
 * - Medium: 3 - 5
 * - High: 6 or more
 *
 * @param {Array} tasks
 * @param {Array} sessions
 * @param {Date|string} [now]
 * @returns {{ score: number, level: 'Low'|'Medium'|'High', breakdown: object }}
 */
export function calculateRiskScore(tasks = [], sessions = [], now = new Date()) {
  const nonDoneTasks = (Array.isArray(tasks) ? tasks : []).filter((t) => t.status !== "done");

  // Overdue tasks
  const overdueCount = nonDoneTasks.filter((t) => isTaskOverdue(t, now)).length;
  const overduePoints = overdueCount * RISK_POINTS.OVERDUE_TASK;

  // Unassigned non-done tasks
  const unassignedCount = nonDoneTasks.filter(
    (t) => !t.assignee || t.assignee.trim().length === 0
  ).length;
  const unassignedPoints = unassignedCount * RISK_POINTS.UNASSIGNED_TASK;

  // Schedule delay points
  const currentDelay = calculateCurrentDelay(sessions);
  let delayPoints = 0;
  if (currentDelay >= DELAY_THRESHOLDS.HIGH) {
    delayPoints = RISK_POINTS.DELAY_HIGH;
  } else if (currentDelay >= DELAY_THRESHOLDS.LOW) {
    delayPoints = RISK_POINTS.DELAY_LOW;
  }

  // Schedule timing clash points
  const clashes = detectTimingClashes(sessions);
  const clashPoints = clashes.length * (RISK_POINTS.TIMING_CLASH || 3);

  const score = overduePoints + unassignedPoints + delayPoints + clashPoints;

  let level = "Low";
  if (score >= 6 || clashes.length >= 2) {
    level = "High";
  } else if (score >= 3 || clashes.length >= 1) {
    level = "Medium";
  }

  return {
    score,
    level,
    breakdown: {
      overdueCount,
      overduePoints,
      unassignedCount,
      unassignedPoints,
      currentDelay,
      delayPoints,
      clashes,
      clashesCount: clashes.length,
      clashPoints,
    },
  };
}

/**
 * Consolidated helper to retrieve all event health metrics.
 *
 * @param {Array} tasks
 * @param {Array} sessions
 * @param {Date|string} [now]
 * @returns {{ taskCompletion: number, volunteerAllocation: number, currentDelay: number, risk: object }}
 */
export function calculateHealthMetrics(tasks = [], sessions = [], now = new Date()) {
  const taskCompletion = calculateTaskCompletion(tasks);
  const volunteerAllocation = calculateVolunteerAllocation(tasks);
  const currentDelay = calculateCurrentDelay(sessions);
  const risk = calculateRiskScore(tasks, sessions, now);

  return {
    taskCompletion,
    volunteerAllocation,
    currentDelay,
    risk,
  };
}
