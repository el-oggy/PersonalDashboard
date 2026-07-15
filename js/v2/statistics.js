/**
 * STATISTICS - Analytics engine
 * Provides stats and insights on task completion
 */

const Statistics = {
    /**
     * Get completion statistics for a task
     */
    getTaskStats(taskId, days = 30) {
        const progress = FlowOSStorage.getTaskProgress(taskId);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        let completed = 0;
        let total = 0;
        const dailyData = [];

        for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
            const dateKey = FlowOSStorage.formatDateKey(d);
            const isCompleted = progress[dateKey]?.completed;

            total++;
            if (isCompleted) completed++;

            dailyData.push({
                date: dateKey,
                completed: isCompleted
            });
        }

        return {
            taskId,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            completed,
            total,
            streak: FlowOSStorage.getCurrentStreak(taskId),
            longestStreak: FlowOSStorage.getLongestStreak(taskId),
            dailyData
        };
    },

    /**
     * Get overall statistics
     */
    getOverallStats(days = 30) {
        const tasks = FlowOSStorage.getTasks();
        const progress = FlowOSStorage.getProgress();

        let totalCompleted = 0;
        let totalTasks = 0;
        let perfectDays = 0;
        const dailyCompletion = [];

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
            const dateKey = FlowOSStorage.formatDateKey(d);
            let dayCompleted = 0;

            for (const task of tasks) {
                if (progress[task.id]?.[dateKey]?.completed) {
                    totalCompleted++;
                    dayCompleted++;
                }
                totalTasks++;
            }

            if (dayCompleted === tasks.length && tasks.length > 0) {
                perfectDays++;
            }

            dailyCompletion.push({
                date: dateKey,
                completed: dayCompleted,
                total: tasks.length,
                percentage: tasks.length > 0 ? Math.round((dayCompleted / tasks.length) * 100) : 0
            });
        }

        return {
            completionRate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
            totalCompleted,
            totalTasks,
            perfectDays,
            perfectDayRate: days > 0 ? Math.round((perfectDays / days) * 100) : 0,
            dailyCompletion,
            averagePerDay: days > 0 ? (totalCompleted / days).toFixed(1) : 0
        };
    },

    /**
     * Get weekly summary
     */
    getWeeklySummary() {
        const tasks = this.getOverallStats(7);
        const weeklyGoal = 70; // Target 70% completion

        return {
            ...tasks,
            goalMet: tasks.completionRate >= weeklyGoal,
            goalTarget: weeklyGoal
        };
    },

    /**
     * Get monthly summary
     */
    getMonthlySummary(year, month) {
        const progress = FlowOSStorage.getProgress();
        const tasks = FlowOSStorage.getTasks();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let totalCompleted = 0;
        const dailyStats = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = FlowOSStorage.formatDateKey(date);
            let dayCompleted = 0;

            for (const task of tasks) {
                if (progress[task.id]?.[dateKey]?.completed) {
                    dayCompleted++;
                }
            }

            totalCompleted += dayCompleted;
            dailyStats.push({
                day,
                completed: dayCompleted,
                total: tasks.length,
                percentage: tasks.length > 0 ? Math.round((dayCompleted / tasks.length) * 100) : 0
            });
        }

        const completionRate = (daysInMonth * tasks.length) > 0
            ? Math.round((totalCompleted / (daysInMonth * tasks.length)) * 100)
            : 0;

        return {
            month,
            year,
            daysInMonth,
            completionRate,
            totalCompleted,
            perfectDays: dailyStats.filter(d => d.completed === d.total).length,
            dailyStats
        };
    },

    /**
     * Get mood analysis
     */
    getMoodAnalysis(days = 30) {
        const progress = FlowOSStorage.getProgress();
        const moodSum = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const moodCompleted = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        let totalEntries = 0;

        for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
            const dateKey = FlowOSStorage.formatDateKey(d);

            for (const taskId in progress) {
                const dayData = progress[taskId][dateKey];
                if (dayData?.mood) {
                    totalEntries++;
                    moodSum[dayData.mood]++;
                    if (dayData.completed) {
                        moodCompleted[dayData.mood]++;
                    }
                }
            }
        }

        const avgMood = totalEntries > 0
            ? (Object.entries(moodSum).reduce((sum, [mood, count]) => sum + (mood * count), 0) / totalEntries)
            : 0;

        return {
            averageMood: avgMood.toFixed(1),
            moodDistribution: moodSum,
            completionByMood: moodCompleted,
            daysWithMood: totalEntries
        };
    },

    /**
     * Get trending data
     */
    getTrends() {
        const overall = this.getOverallStats(30);
        const weekly = this.getWeeklySummary();

        return {
            overall: {
                ...overall,
                trend: overall.completionRate > weekly.completionRate ? 'improving' : 'declining'
            },
            weekly
        };
    },

    /**
     * Generate a summary report
     */
    generateReport() {
        const stats = this.getOverallStats(30);
        const trends = this.getTrends();

        return {
            title: 'FlowOS 30-Day Report',
            generated: new Date().toISOString(),
            completionRate: `${stats.completionRate}%`,
            tasksCompleted: stats.totalCompleted,
            perfectDays: stats.perfectDays,
            streak: {
                longest: Math.max(...stats.dailyCompletion.map(d => d/perfectDays)),
                current: FlowOSStorage.getCurrentStreak()
            },
            trend: trends.overall.trend,
            averagePerDay: stats.averagePerDay
        };
    }
};

window.Statistics = Statistics;