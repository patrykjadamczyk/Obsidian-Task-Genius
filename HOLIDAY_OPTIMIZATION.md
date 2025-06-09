# ICS Holiday Optimization and Status Mapping

This document describes the holiday detection, grouping, and status mapping features for ICS calendar integration.

## Features Overview

### 1. Holiday Detection and Grouping
Automatically detect and group consecutive holiday events to reduce visual clutter in forecast and calendar views.

### 2. Status Mapping
Map ICS events to specific task statuses based on timing and event properties, integrating with the existing task status system.

## Holiday Detection Configuration

### Basic Settings
- **Enable Holiday Detection**: Toggle holiday detection on/off
- **Grouping Strategy**: How to handle consecutive holidays
  - `none`: Show all events individually
  - `first-only`: Show only the first day of consecutive holidays
  - `summary`: Show a summary with day count
  - `range`: Show first and last days
- **Maximum Gap Days**: Days between events to consider them consecutive (default: 1)

### Detection Patterns
Configure patterns to identify holiday events:
- **Summary Patterns**: Regex patterns for event titles
- **Keywords**: Simple keywords to match
- **Categories**: Event categories that indicate holidays

### Display Control
- **Show in Forecast**: Whether to show holiday events in forecast view
- **Show in Calendar**: Whether to show holiday events in calendar view
- **Group Display Format**: Custom format for grouped display

### Example Configuration for Chinese Holidays
```json
{
  "enabled": true,
  "detectionPatterns": {
    "summary": ["假期", "端午节", "第\\d+天", "共\\d+天", "\\d+天/共\\d+天"],
    "keywords": ["假期", "放假", "端午"],
    "categories": ["holiday", "假期"]
  },
  "groupingStrategy": "first-only",
  "maxGapDays": 1,
  "showInForecast": true,
  "showInCalendar": true,
  "groupDisplayFormat": "{title} ({count} days)"
}
```

## Status Mapping Configuration

### Overview
The status mapping feature allows you to automatically assign specific task statuses to ICS events based on timing and event properties. This integrates with the existing task status system from plugin settings.

### Basic Settings
- **Enable Status Mapping**: Toggle status mapping on/off
- **Override ICS Status**: Whether to override original ICS event status

### Timing Rules
Map events based on when they occur:
- **Past Events Status**: Status for events that have already ended (default: "x" - Complete)
- **Current Events Status**: Status for events happening today (default: "/" - In Progress)  
- **Future Events Status**: Status for events in the future (default: " " - Incomplete)

### Property Rules (Higher Priority)
Map events based on their properties:

#### Holiday Mapping
- **Holiday Status**: Status for events detected as holidays (e.g., "-" - Cancelled)
- **Non-Holiday Status**: Optional status for non-holiday events

#### Category Mapping
Map specific event categories to statuses:
```
holiday:-
vacation:-
假期:-
节日:-
meeting:/
```

#### Summary Pattern Mapping
Map events based on title patterns (regex supported):
- Pattern: `^Meeting:` → Status: `/` (In Progress)
- Pattern: `假期.*第\d+天` → Status: `-` (Cancelled)

### Integration with Existing Status System
The status mapping uses the existing task status marks from plugin settings:
- Uses `taskStatusMarks` configuration
- Maps to status names like "Completed", "In Progress", "Abandoned", etc.
- Fallback to default status marks if custom marks not found

### Example Configuration
```json
{
  "enabled": true,
  "timingRules": {
    "pastEvents": "x",
    "currentEvents": "/", 
    "futureEvents": " "
  },
  "propertyRules": {
    "categoryMapping": {
      "holiday": "-",
      "vacation": "-",
      "假期": "-",
      "meeting": "/"
    },
    "holidayMapping": {
      "holidayStatus": "-",
      "nonHolidayStatus": undefined
    },
    "summaryMapping": [
      {
        "pattern": "假期.*第\\d+天",
        "status": "-"
      }
    ]
  },
  "overrideIcsStatus": true
}
```

## Use Cases

### 1. Chinese Holiday Calendar Optimization
**Problem**: Calendar shows "端午节 假期 第1天/共3天", "端午节 假期 第2天/共3天", "端午节 假期 第3天/共3天"

**Solution**: 
- Enable holiday detection with Chinese patterns
- Use "first-only" grouping strategy
- Set holiday status to "cancelled" to hide from active tasks

### 2. Work Calendar Integration
**Problem**: Past meetings show as incomplete tasks, future meetings clutter forecast

**Solution**:
- Map past events to "completed" status
- Map current events to "in progress" 
- Map future events to "incomplete"
- Use category mapping for different meeting types

### 3. Personal Calendar Management
**Problem**: Vacation days and holidays appear as tasks to complete

**Solution**:
- Detect vacation/holiday categories
- Map to "cancelled" status to exclude from active task lists
- Group consecutive vacation days

## Technical Implementation

### Holiday Detection Process
1. **Pattern Matching**: Check event title, description, and categories against configured patterns
2. **Grouping**: Group consecutive events with same base pattern
3. **Display Strategy**: Apply configured display strategy (first-only, summary, range)
4. **Filtering**: Apply forecast/calendar visibility settings

### Status Mapping Process
1. **Property Rules**: Check holiday detection, categories, and summary patterns (highest priority)
2. **Timing Rules**: Apply timing-based status mapping
3. **Integration**: Convert to actual status marks using plugin settings
4. **Fallback**: Use original ICS status if no rules match

### Performance Considerations
- Holiday detection runs once per sync
- Grouping algorithm is O(n log n) for sorting events
- Status mapping is O(1) per event
- Results are cached until next sync

## Configuration Tips

### Holiday Detection
1. Start with broad patterns and refine
2. Test with actual calendar data
3. Use "first-only" for long holiday periods
4. Consider timezone differences

### Status Mapping
1. Use timing rules as base configuration
2. Add property rules for specific cases
3. Test with different event types
4. Monitor task list behavior

### Performance
1. Limit detection patterns to necessary ones
2. Use specific categories when possible
3. Consider max gap days for grouping
4. Monitor sync performance with large calendars

## Troubleshooting

### Holiday Detection Not Working
- Check pattern syntax (regex)
- Verify event data structure
- Test with simple keywords first
- Check console for parsing errors

### Status Mapping Issues
- Verify timing rule configuration
- Check property rule priority
- Ensure status marks exist in settings
- Test with individual events

### Performance Issues
- Reduce number of detection patterns
- Increase max gap days carefully
- Check calendar size and sync frequency
- Monitor memory usage with large datasets 