// Debug script to check weekend hiding settings
// Run this in the browser console when the plugin is loaded

function debugWeekendSettings() {
    console.log("=== Weekend Hiding Debug ===");
    
    // Try to find the plugin instance
    const plugin = app.plugins.plugins['task-progress-bar'];
    
    if (!plugin) {
        console.error("Plugin not found!");
        return;
    }
    
    console.log("Plugin found:", plugin);
    console.log("Plugin settings:", plugin.settings);
    
    // Check view configurations
    const viewConfigs = plugin.settings.viewConfiguration;
    console.log("All view configurations:", viewConfigs);
    
    // Find calendar view config
    const calendarConfig = viewConfigs.find(v => v.id === 'calendar');
    console.log("Calendar view config:", calendarConfig);
    
    if (calendarConfig && calendarConfig.specificConfig) {
        console.log("Calendar specific config:", calendarConfig.specificConfig);
        console.log("hideWeekends setting:", calendarConfig.specificConfig.hideWeekends);
    } else {
        console.log("No calendar specific config found!");
    }
    
    // Check DOM elements
    const calendarContainers = document.querySelectorAll('.full-calendar-container');
    console.log("Found calendar containers:", calendarContainers.length);
    
    calendarContainers.forEach((container, index) => {
        console.log(`Container ${index}:`, container);
        console.log(`Has hide-weekends class:`, container.classList.contains('hide-weekends'));
        
        const weekdayHeaders = container.querySelectorAll('.calendar-weekday');
        console.log(`Weekday headers count:`, weekdayHeaders.length);
        
        const dayCells = container.querySelectorAll('.calendar-day-cell');
        console.log(`Day cells count:`, dayCells.length);
        
        // Check for weekend day cells
        const weekendCells = Array.from(dayCells).filter(cell => {
            const dateStr = cell.getAttribute('data-date');
            if (dateStr) {
                const date = new Date(dateStr);
                const dayOfWeek = date.getDay();
                return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
            }
            return false;
        });
        console.log(`Weekend cells found:`, weekendCells.length);
    });
    
    console.log("=== End Debug ===");
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
    debugWeekendSettings();
}

// Export for Node.js if needed
if (typeof module !== 'undefined') {
    module.exports = debugWeekendSettings;
}
