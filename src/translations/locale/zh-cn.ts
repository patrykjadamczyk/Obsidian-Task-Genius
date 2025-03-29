// Simplified Chinese translations
const translations = {
	"Comprehensive task management plugin for Obsidian with progress bars, task status cycling, and advanced task tracking features.":
		"全面的 Obsidian 任务管理插件，具有进度条、任务状态循环和高级任务跟踪功能。",
	"Show progress bar": "显示进度条",
	"Toggle this to show the progress bar.": "切换此选项以显示进度条。",
	"Support hover to show progress info": "支持悬停显示进度信息",
	"Toggle this to allow this plugin to show progress info when hovering over the progress bar.":
		"切换此选项以允许插件在鼠标悬停在进度条上时显示进度信息。",
	"Add progress bar to non-task bullet": "为非任务项添加进度条",
	"Toggle this to allow adding progress bars to regular list items (non-task bullets).":
		"切换此选项以允许为常规列表项（非任务项）添加进度条。",
	"Add progress bar to Heading": "为标题添加进度条",
	"Toggle this to allow this plugin to add progress bar for Task below the headings.":
		"切换此选项以允许插件为标题下的任务添加进度条。",
	"Enable heading progress bars": "启用标题进度条",
	"Add progress bars to headings to show progress of all tasks under that heading.":
		"为标题添加进度条以显示该标题下所有任务的进度。",
	"Auto complete parent task": "自动完成父任务",
	"Toggle this to allow this plugin to auto complete parent task when all child tasks are completed.":
		"切换此选项以允许插件在所有子任务完成时自动完成父任务。",
	"Mark parent as 'In Progress' when partially complete":
		'部分完成时将父任务标记为"进行中"',
	"When some but not all child tasks are completed, mark the parent task as 'In Progress'. Only works when 'Auto complete parent' is enabled.":
		'当部分子任务完成但不是全部时，将父任务标记为"进行中"。仅在启用"自动完成父任务"时有效。',
	"Count sub children level of current Task": "计算当前任务的子任务层级",
	"Toggle this to allow this plugin to count sub tasks.":
		"切换此选项以允许插件计算子任务。",
	"Task Status Settings": "任务状态设置",
	"Select a predefined task status collection or customize your own":
		"选择预定义的任务状态集合或自定义您自己的",
	"Completed task markers": "已完成任务标记",
	'Characters in square brackets that represent completed tasks. Example: "x|X"':
		'方括号中表示已完成任务的字符。例如："x|X"',
	"Planned task markers": "计划任务标记",
	'Characters in square brackets that represent planned tasks. Example: "?"':
		'方括号中表示计划任务的字符。例如："?"',
	"In progress task markers": "进行中任务标记",
	'Characters in square brackets that represent tasks in progress. Example: ">|/"':
		'方括号中表示进行中任务的字符。例如：">|/"',
	"Abandoned task markers": "已放弃任务标记",
	'Characters in square brackets that represent abandoned tasks. Example: "-"':
		'方括号中表示已放弃任务的字符。例如："-"',
	'Characters in square brackets that represent not started tasks. Default is space " "':
		'方括号中表示未开始任务的字符。默认为空格 " "',
	"Count other statuses as": "将其他状态计为",
	'Select the status to count other statuses as. Default is "Not Started".':
		'选择将其他状态计为哪种状态。默认为"未开始"。',
	"Task Counting Settings": "任务计数设置",
	"Exclude specific task markers": "排除特定任务标记",
	'Specify task markers to exclude from counting. Example: "?|/"':
		'指定要从计数中排除的任务标记。例如："?|/"',
	"Only count specific task markers": "仅计数特定任务标记",
	"Toggle this to only count specific task markers":
		"切换此选项以仅计数特定任务标记",
	"Specific task markers to count": "要计数的特定任务标记",
	'Specify which task markers to count. Example: "x|X|>|/"':
		'指定要计数的任务标记。例如："x|X|>|/"',
	"Conditional Progress Bar Display": "条件进度条显示",
	"Hide progress bars based on conditions": "基于条件隐藏进度条",
	"Toggle this to enable hiding progress bars based on tags, folders, or metadata.":
		"切换此选项以启用基于标签、文件夹或元数据隐藏进度条。",
	"Hide by tags": "按标签隐藏",
	'Specify tags that will hide progress bars (comma-separated, without #). Example: "no-progress-bar,hide-progress"':
		'指定将隐藏进度条的标签（逗号分隔，不带 #）。例如："no-progress-bar,hide-progress"',
	"Hide by folders": "按文件夹隐藏",
	'Specify folder paths that will hide progress bars (comma-separated). Example: "Daily Notes,Projects/Hidden"':
		'指定将隐藏进度条的文件夹路径（逗号分隔）。例如："Daily Notes,Projects/Hidden"',
	"Hide by metadata": "按元数据隐藏",
	'Specify frontmatter metadata that will hide progress bars. Example: "hide-progress-bar: true"':
		'指定将隐藏进度条的前置元数据。例如："hide-progress-bar: true"',
	"Task Status Switcher": "任务状态切换器",
	"Enable/disable the ability to cycle through task states by clicking.":
		"启用/禁用通过点击循环切换任务状态的功能。",
	"Enable custom task marks": "启用自定义任务标记",
	"Replace default checkboxes with styled text marks that follow your task status cycle when clicked.":
		"用样式化文本标记替换默认复选框，点击时遵循您的任务状态循环。",
	"Enable cycle complete status": "启用循环完成状态",
	"Enable/disable the ability to automatically cycle through task states when pressing a mark.":
		"启用/禁用按下标记时自动循环切换任务状态的功能。",
	"Always cycle new tasks": "始终循环新任务",
	"When enabled, newly inserted tasks will immediately cycle to the next status. When disabled, newly inserted tasks with valid marks will keep their original mark.":
		"启用后，新插入的任务将立即循环到下一个状态。禁用时，带有有效标记的新插入任务将保持其原始标记。",
	"Task Status Cycle and Marks": "任务状态循环和标记",
	"Define task states and their corresponding marks. The order from top to bottom defines the cycling sequence.":
		"定义任务状态及其对应的标记。从上到下的顺序定义了循环顺序。",
	"Completed Task Mover": "已完成任务移动功能",
	"Enable completed task mover": "启用已完成任务移动功能",
	"Toggle this to enable commands for moving completed tasks to another file.":
		"切换此选项以启用将已完成任务移动到另一个文件的命令。",
	"Task marker type": "任务标记类型",
	"Choose what type of marker to add to moved tasks":
		"选择要添加到已移动任务的标记类型",
	"Version marker text": "版本标记文本",
	"Text to append to tasks when moved (e.g., 'version 1.0')":
		"移动任务时附加的文本（例如，'version 1.0'）",
	"Date marker text": "日期标记文本",
	"Text to append to tasks when moved (e.g., 'archived on 2023-12-31')":
		"移动任务时附加的文本（例如，'archived on 2023-12-31'）",
	"Custom marker text": "自定义标记文本",
	"Use {{DATE:format}} for date formatting (e.g., {{DATE:YYYY-MM-DD}}":
		"使用 {{DATE:format}} 进行日期格式化（例如，{{DATE:YYYY-MM-DD}}",
	"Treat abandoned tasks as completed": "将已放弃任务视为已完成",
	"If enabled, abandoned tasks will be treated as completed.":
		"如果启用，已放弃的任务将被视为已完成。",
	"Complete all moved tasks": "完成所有已移动的任务",
	"If enabled, all moved tasks will be marked as completed.":
		"如果启用，所有已移动的任务将被标记为已完成。",
	"With current file link": "带当前文件链接",
	"A link to the current file will be added to the parent task of the moved tasks.":
		"当前文件的链接将添加到已移动任务的父任务中。",
	Donate: "捐赠",
	"If you like this plugin, consider donating to support continued development:":
		"如果您喜欢这个插件，请考虑捐赠以支持持续开发：",
	"Add number to the Progress Bar": "在进度条中添加数字",
	"Toggle this to allow this plugin to add tasks number to progress bar.":
		"切换此选项以允许插件在进度条中添加任务数量。",
	"Show percentage": "显示百分比",
	"Toggle this to allow this plugin to show percentage in the progress bar.":
		"切换此选项以允许插件在进度条中显示百分比。",
	"Customize progress text": "自定义进度文本",
	"Toggle this to customize text representation for different progress percentage ranges.":
		"切换此选项以自定义不同进度百分比范围的文本表示。",
	"Progress Ranges": "进度范围",
	"Define progress ranges and their corresponding text representations.":
		"定义进度范围及其对应的文本表示。",
	"Add new range": "添加新范围",
	"Add a new progress percentage range with custom text":
		"添加带有自定义文本的新进度百分比范围",
	"Min percentage (0-100)": "最小百分比 (0-100)",
	"Max percentage (0-100)": "最大百分比 (0-100)",
	"Text template (use {{PROGRESS}})": "文本模板（使用 {{PROGRESS}}）",
	"Reset to defaults": "重置为默认值",
	"Reset progress ranges to default values": "将进度范围重置为默认值",
	Reset: "重置",
	"Priority Picker Settings": "优先级选择器设置",
	"Toggle to enable priority picker dropdown for emoji and letter format priorities.":
		"切换以启用表情符号和字母格式优先级的优先级选择器下拉菜单。",
	"Enable priority picker": "启用优先级选择器",
	"Enable priority keyboard shortcuts": "启用优先级键盘快捷键",
	"Toggle to enable keyboard shortcuts for setting task priorities.":
		"切换以启用设置任务优先级的键盘快捷键。",
	"Date picker": "日期选择器",
	"Enable date picker": "启用日期选择器",
	"Toggle this to enable date picker for tasks. This will add a calendar icon near your tasks which you can click to select a date.":
		"切换此选项以启用任务的日期选择器。这将在您的任务旁边添加一个日历图标，您可以点击它来选择日期。",
	"Date mark": "日期标记",
	"Emoji mark to identify dates. You can use multiple emoji separated by commas.":
		"用于标识日期的表情符号。您可以使用逗号分隔的多个表情符号。",
	"Quick capture": "快速捕获",
	"Enable quick capture": "启用快速捕获",
	"Toggle this to enable Org-mode style quick capture panel. Press Alt+C to open the capture panel.":
		"切换此选项以启用 Org-mode 风格的快速捕获面板。按 Alt+C 打开捕获面板。",
	"Target file": "目标文件",
	"The file where captured text will be saved. You can include a path, e.g., 'folder/Quick Capture.md'":
		"捕获的文本将保存到的文件。您可以包含路径，例如，'folder/Quick Capture.md'",
	"Placeholder text": "占位文本",
	"Placeholder text to display in the capture panel":
		"在捕获面板中显示的占位文本",
	"Append to file": "附加到文件",
	"If enabled, captured text will be appended to the target file. If disabled, it will replace the file content.":
		"如果启用，捕获的文本将附加到目标文件。如果禁用，它将替换文件内容。",
	"Task Filter": "任务过滤器",
	"Enable Task Filter": "启用任务过滤器",
	"Toggle this to enable the task filter panel":
		"切换此选项以启用任务过滤器面板",
	"Preset Filters": "预设过滤器",
	"Create and manage preset filters for quick access to commonly used task filters.":
		"创建和管理预设过滤器，以快速访问常用的任务过滤器。",
	"Edit Filter: ": "编辑过滤器：",
	"Filter name": "过滤器名称",
	"Task Status": "任务状态",
	"Include or exclude tasks based on their status":
		"根据任务状态包含或排除任务",
	"Include Completed Tasks": "包含已完成任务",
	"Include In Progress Tasks": "包含进行中任务",
	"Include Abandoned Tasks": "包含已放弃任务",
	"Include Not Started Tasks": "包含未开始任务",
	"Include Planned Tasks": "包含计划任务",
	"Related Tasks": "相关任务",
	"Include parent, child, and sibling tasks in the filter":
		"在过滤器中包含父任务、子任务和同级任务",
	"Include Parent Tasks": "包含父任务",
	"Include Child Tasks": "包含子任务",
	"Include Sibling Tasks": "包含同级任务",
	"Advanced Filter": "高级过滤器",
	"Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1'":
		"使用布尔运算：AND, OR, NOT。例如：'text content AND #tag1'",
	"Filter query": "过滤查询",
	"Filter out tasks": "过滤掉任务",
	"If enabled, tasks that match the query will be hidden, otherwise they will be shown":
		"如果启用，匹配查询的任务将被隐藏，否则将显示",
	Save: "保存",
	Cancel: "取消",
	"Enable task status switcher": "启用任务状态切换器",
	"Add Status": "添加状态",
	"Say Thank You": "谢谢",
	"Hide filter panel": "隐藏过滤器面板",
	"Show filter panel": "显示过滤器面板",
	"Filter Tasks": "过滤任务",
	"Preset filters": "预设过滤器",
	"Select a saved filter preset to apply": "选择一个保存的过滤器预设以应用",
	"Select a preset...": "选择一个预设...",
	Query: "查询",
	"Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1 AND DATE:<2022-01-02 NOT PRIORITY:>=#B' - Supports >, <, =, >=, <=, != for PRIORITY and DATE.":
		"使用布尔运算：AND, OR, NOT。例如：'text content AND #tag1 AND DATE:<2022-01-02 NOT PRIORITY:>=#B' - 支持 >, <, =, >=, <=, != 用于 PRIORITY 和 DATE。",
	"If true, tasks that match the query will be hidden, otherwise they will be shown":
		"如果启用，匹配查询的任务将被隐藏，否则将显示",
	Completed: "已完成",
	"In Progress": "进行中",
	Abandoned: "已放弃",
	"Not Started": "未开始",
	Planned: "计划",
	"Include Related Tasks": "包含相关任务",
	"Parent Tasks": "父任务",
	"Child Tasks": "子任务",
	"Sibling Tasks": "同级任务",
	Apply: "应用",
	"New Preset": "新预设",
	"Preset saved": "预设已保存",
	"No changes to save": "没有更改要保存",
	Close: "关闭",
	"Capture to": "捕获到",
	Capture: "捕获",
	"Capture thoughts, tasks, or ideas...": "捕获想法、任务或想法...",
	Tomorrow: "明天",
	"In 2 days": "2天后",
	"In 3 days": "3天后",
	"In 5 days": "5天后",
	"In 1 week": "1周后",
	"In 10 days": "10天后",
	"In 2 weeks": "2周后",
	"In 1 month": "1个月后",
	"In 2 months": "2个月后",
	"In 3 months": "3个月后",
	"In 6 months": "6个月后",
	"In 1 year": "1年后",
	"In 5 years": "5年后",
	"In 10 years": "10年后",
	"Highest priority": "最高优先级",
	"High priority": "高优先级",
	"Medium priority": "中等优先级",
	"No priority": "无优先级",
	"Low priority": "低优先级",
	"Lowest priority": "最低优先级",
	"Priority A": "优先级A",
	"Priority B": "优先级B",
	"Priority C": "优先级C",
	"Task Priority": "任务优先级",
	"Remove Priority": "移除优先级",
	"Cycle task status forward": "向前循环任务状态",
	"Cycle task status backward": "向后循环任务状态",
	"Remove priority": "移除优先级",
	"Move task to another file": "将任务移动到另一个文件",
	"Move all completed subtasks to another file":
		"将所有已完成的子任务移动到另一个文件",
	"Move direct completed subtasks to another file":
		"将直接已完成的子任务移动到另一个文件",
	"Move all subtasks to another file": "将所有子任务移动到另一个文件",
	"Set priority": "设置优先级",
	"Toggle quick capture panel": "切换快速捕获面板",
	"Quick capture (Global)": "快速捕获（全局）",
	"Toggle task filter panel": "切换任务过滤器面板",
};

export default translations;
