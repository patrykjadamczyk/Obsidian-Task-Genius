// Japanese translations
const translations = {
	"Comprehensive task management plugin for Obsidian with progress bars, task status cycling, and advanced task tracking features.":
		"プログレスバー、タスクステータスサイクル、高度なタスク追跡機能を備えたObsidian用の包括的なタスク管理プラグイン。",
	"Show progress bar": "プログレスバーを表示",
	"Toggle this to show the progress bar.":
		"プログレスバーを表示するにはこれを切り替えてください。",
	"Support hover to show progress info": "ホバーでプログレス情報を表示",
	"Toggle this to allow this plugin to show progress info when hovering over the progress bar.":
		"プログレスバーにカーソルを合わせたときに進捗情報を表示できるようにするにはこれを切り替えてください。",
	"Add progress bar to non-task bullet":
		"非タスク箇条書きにプログレスバーを追加",
	"Toggle this to allow adding progress bars to regular list items (non-task bullets).":
		"通常のリストアイテム（非タスク箇条書き）にプログレスバーを追加できるようにするにはこれを切り替えてください。",
	"Add progress bar to Heading": "見出しにプログレスバーを追加",
	"Toggle this to allow this plugin to add progress bar for Task below the headings.":
		"見出しの下のタスクにプログレスバーを追加できるようにするにはこれを切り替えてください。",
	"Enable heading progress bars": "見出しプログレスバーを有効化",
	"Add progress bars to headings to show progress of all tasks under that heading.":
		"その見出しの下にあるすべてのタスクの進捗状況を表示するために、見出しにプログレスバーを追加します。",
	"Auto complete parent task": "親タスクを自動完了",
	"Toggle this to allow this plugin to auto complete parent task when all child tasks are completed.":
		"すべての子タスクが完了したときに親タスクを自動的に完了させるにはこれを切り替えてください。",
	"Mark parent as 'In Progress' when partially complete":
		"部分的に完了したら親を「進行中」としてマーク",
	"When some but not all child tasks are completed, mark the parent task as 'In Progress'. Only works when 'Auto complete parent' is enabled.":
		"一部の子タスクが完了しているが全部ではない場合、親タスクを「進行中」としてマークします。「親タスクを自動完了」が有効な場合のみ機能します。",
	"Count sub children level of current Task":
		"現在のタスクのサブ子レベルをカウント",
	"Toggle this to allow this plugin to count sub tasks.":
		"サブタスクをカウントできるようにするにはこれを切り替えてください。",
	"Task Status Settings": "タスクステータス設定",
	"Select a predefined task status collection or customize your own":
		"事前定義されたタスクステータスコレクションを選択するか、独自にカスタマイズしてください",
	"Completed task markers": "完了タスクマーカー",
	'Characters in square brackets that represent completed tasks. Example: "x|X"':
		'完了したタスクを表す角括弧内の文字。例："x|X"',
	"Planned task markers": "計画タスクマーカー",
	'Characters in square brackets that represent planned tasks. Example: "?"':
		'計画されたタスクを表す角括弧内の文字。例："?"',
	"In progress task markers": "進行中タスクマーカー",
	'Characters in square brackets that represent tasks in progress. Example: ">|/"':
		'進行中のタスクを表す角括弧内の文字。例：">|/"',
	"Abandoned task markers": "放棄タスクマーカー",
	'Characters in square brackets that represent abandoned tasks. Example: "-"':
		'放棄されたタスクを表す角括弧内の文字。例："-"',
	'Characters in square brackets that represent not started tasks. Default is space " "':
		'開始されていないタスクを表す角括弧内の文字。デフォルトはスペース " "',
	"Count other statuses as": "他のステータスをカウントする方法",
	'Select the status to count other statuses as. Default is "Not Started".':
		"他のステータスをカウントするステータスを選択します。デフォルトは「未開始」です。",
	"Task Counting Settings": "タスクカウント設定",
	"Exclude specific task markers": "特定のタスクマーカーを除外",
	'Specify task markers to exclude from counting. Example: "?|/"':
		'カウントから除外するタスクマーカーを指定します。例："?|/"',
	"Only count specific task markers": "特定のタスクマーカーのみをカウント",
	"Toggle this to only count specific task markers":
		"特定のタスクマーカーのみをカウントするにはこれを切り替えてください",
	"Specific task markers to count": "カウントする特定のタスクマーカー",
	'Specify which task markers to count. Example: "x|X|>|/"':
		'カウントするタスクマーカーを指定します。例："x|X|>|/"',
	"Conditional Progress Bar Display": "条件付きプログレスバー表示",
	"Hide progress bars based on conditions":
		"条件に基づいてプログレスバーを非表示",
	"Toggle this to enable hiding progress bars based on tags, folders, or metadata.":
		"タグ、フォルダ、またはメタデータに基づいてプログレスバーを非表示にするにはこれを切り替えてください。",
	"Hide by tags": "タグで非表示",
	'Specify tags that will hide progress bars (comma-separated, without #). Example: "no-progress-bar,hide-progress"':
		'プログレスバーを非表示にするタグを指定します（カンマ区切り、#なし）。例："no-progress-bar,hide-progress"',
	"Hide by folders": "フォルダで非表示",
	'Specify folder paths that will hide progress bars (comma-separated). Example: "Daily Notes,Projects/Hidden"':
		'プログレスバーを非表示にするフォルダパスを指定します（カンマ区切り）。例："Daily Notes,Projects/Hidden"',
	"Hide by metadata": "メタデータで非表示",
	'Specify frontmatter metadata that will hide progress bars. Example: "hide-progress-bar: true"':
		'プログレスバーを非表示にするフロントマターメタデータを指定します。例："hide-progress-bar: true"',
	"Task Status Switcher": "タスクステータススイッチャー",
	"Enable task status switcher": "タスクステータススイッチャーを有効化",
	"Enable/disable the ability to cycle through task states by clicking.":
		"クリックによるタスク状態の循環機能を有効/無効にします。",
	"Enable custom task marks": "カスタムタスクマークを有効化",
	"Replace default checkboxes with styled text marks that follow your task status cycle when clicked.":
		"デフォルトのチェックボックスを、クリック時にタスクステータスサイクルに従ってスタイル付きテキストマークに置き換えます。",
	"Enable cycle complete status": "サイクル完了ステータスを有効化",
	"Enable/disable the ability to automatically cycle through task states when pressing a mark.":
		"マークを押したときに自動的にタスク状態を循環する機能を有効/無効にします。",
	"Always cycle new tasks": "常に新しいタスクをサイクル",
	"When enabled, newly inserted tasks will immediately cycle to the next status. When disabled, newly inserted tasks with valid marks will keep their original mark.":
		"有効にすると、新しく挿入されたタスクは直ちに次のステータスに循環します。無効にすると、有効なマークを持つ新しく挿入されたタスクは元のマークを保持します。",
	"Task Status Cycle and Marks": "タスクステータスサイクルとマーク",
	"Define task states and their corresponding marks. The order from top to bottom defines the cycling sequence.":
		"タスク状態とそれに対応するマークを定義します。上から下への順序がサイクルの順序を定義します。",
	"Add Status": "ステータスを追加",
	"Completed Task Mover": "完了タスク移動ツール",
	"Enable completed task mover": "完了タスク移動ツールを有効化",
	"Toggle this to enable commands for moving completed tasks to another file.":
		"完了したタスクを別のファイルに移動するコマンドを有効にするにはこれを切り替えてください。",
	"Task marker type": "タスクマーカータイプ",
	"Choose what type of marker to add to moved tasks":
		"移動したタスクに追加するマーカーのタイプを選択",
	"Version marker text": "バージョンマーカーテキスト",
	"Text to append to tasks when moved (e.g., 'version 1.0')":
		"タスクを移動するときに追加するテキスト（例：'version 1.0'）",
	"Date marker text": "日付マーカーテキスト",
	"Text to append to tasks when moved (e.g., 'archived on 2023-12-31')":
		"タスクを移動するときに追加するテキスト（例：'archived on 2023-12-31'）",
	"Custom marker text": "カスタムマーカーテキスト",
	"Use {{DATE:format}} for date formatting (e.g., {{DATE:YYYY-MM-DD}}":
		"日付フォーマットには {{DATE:format}} を使用します（例：{{DATE:YYYY-MM-DD}}",
	"Treat abandoned tasks as completed": "放棄されたタスクを完了として扱う",
	"If enabled, abandoned tasks will be treated as completed.":
		"有効にすると、放棄されたタスクは完了として扱われます。",
	"Complete all moved tasks": "移動したすべてのタスクを完了",
	"If enabled, all moved tasks will be marked as completed.":
		"有効にすると、移動したすべてのタスクが完了としてマークされます。",
	"With current file link": "現在のファイルリンク付き",
	"A link to the current file will be added to the parent task of the moved tasks.":
		"移動したタスクの親タスクに現在のファイルへのリンクが追加されます。",
	"Say Thank You": "感謝の言葉",
	Donate: "寄付",
	"If you like this plugin, consider donating to support continued development:":
		"このプラグインが気に入ったら、継続的な開発をサポートするために寄付をご検討ください：",
	"Add number to the Progress Bar": "プログレスバーに数字を追加",
	"Toggle this to allow this plugin to add tasks number to progress bar.":
		"プログレスバーにタスク数を追加できるようにするにはこれを切り替えてください。",
	"Show percentage": "パーセンテージを表示",
	"Toggle this to allow this plugin to show percentage in the progress bar.":
		"プログレスバーにパーセンテージを表示できるようにするにはこれを切り替えてください。",
	"Customize progress text": "進捗テキストをカスタマイズ",
	"Toggle this to customize text representation for different progress percentage ranges.":
		"異なる進捗パーセンテージ範囲のテキスト表現をカスタマイズするにはこれを切り替えてください。",
	"Progress Ranges": "進捗範囲",
	"Define progress ranges and their corresponding text representations.":
		"進捗範囲とそれに対応するテキスト表現を定義します。",
	"Add new range": "新しい範囲を追加",
	"Add a new progress percentage range with custom text":
		"カスタムテキストで新しい進捗パーセンテージ範囲を追加",
	"Min percentage (0-100)": "最小パーセンテージ（0-100）",
	"Max percentage (0-100)": "最大パーセンテージ（0-100）",
	"Text template (use {{PROGRESS}})":
		"テキストテンプレート（{{PROGRESS}}を使用）",
	"Reset to defaults": "デフォルトにリセット",
	"Reset progress ranges to default values":
		"進捗範囲をデフォルト値にリセット",
	Reset: "リセット",
	"Priority Picker Settings": "優先度ピッカー設定",
	"Toggle to enable priority picker dropdown for emoji and letter format priorities.":
		"絵文字と文字形式の優先度のための優先度ピッカードロップダウンを有効にするには切り替えてください。",
	"Enable priority picker": "優先度ピッカーを有効化",
	"Enable priority keyboard shortcuts":
		"優先度キーボードショートカットを有効化",
	"Toggle to enable keyboard shortcuts for setting task priorities.":
		"タスクの優先度を設定するためのキーボードショートカットを有効にするには切り替えてください。",
	"Date picker": "日付ピッカー",
	"Enable date picker": "日付ピッカーを有効化",
	"Toggle this to enable date picker for tasks. This will add a calendar icon near your tasks which you can click to select a date.":
		"タスクの日付ピッカーを有効にするにはこれを切り替えてください。これにより、タスクの近くにカレンダーアイコンが追加され、クリックして日付を選択できます。",
	"Date mark": "日付マーク",
	"Emoji mark to identify dates. You can use multiple emoji separated by commas.":
		"日付を識別する絵文字マーク。カンマで区切って複数の絵文字を使用できます。",
	"Quick capture": "クイックキャプチャ",
	"Enable quick capture": "クイックキャプチャを有効化",
	"Toggle this to enable Org-mode style quick capture panel. Press Alt+C to open the capture panel.":
		"Org-modeスタイルのクイックキャプチャパネルを有効にするにはこれを切り替えてください。Alt+Cを押してキャプチャパネルを開きます。",
	"Target file": "ターゲットファイル",
	"The file where captured text will be saved. You can include a path, e.g., 'folder/Quick Capture.md'":
		"キャプチャしたテキストが保存されるファイル。パスを含めることができます。例：'folder/Quick Capture.md'",
	"Placeholder text": "プレースホルダーテキスト",
	"Placeholder text to display in the capture panel":
		"キャプチャパネルに表示するプレースホルダーテキスト",
	"Append to file": "ファイルに追加",
	"If enabled, captured text will be appended to the target file. If disabled, it will replace the file content.":
		"有効にすると、キャプチャしたテキストはターゲットファイルに追加されます。無効にすると、ファイルの内容が置き換えられます。",
	"Task Filter": "タスクフィルター",
	"Enable Task Filter": "タスクフィルターを有効化",
	"Toggle this to enable the task filter panel":
		"タスクフィルターパネルを有効にするにはこれを切り替えてください",
	"Preset Filters": "プリセットフィルター",
	"Create and manage preset filters for quick access to commonly used task filters.":
		"よく使用するタスクフィルターにすばやくアクセスするためのプリセットフィルターを作成および管理します。",
	"Edit Filter: ": "フィルターを編集：",
	"Filter name": "フィルター名",
	"Task Status": "タスクステータス",
	"Include or exclude tasks based on their status":
		"ステータスに基づいてタスクを含めるか除外する",
	"Include Completed Tasks": "完了タスクを含める",
	"Include In Progress Tasks": "進行中タスクを含める",
	"Include Abandoned Tasks": "放棄タスクを含める",
	"Include Not Started Tasks": "未開始タスクを含める",
	"Include Planned Tasks": "計画タスクを含める",
	"Related Tasks": "関連タスク",
	"Include parent, child, and sibling tasks in the filter":
		"フィルターに親、子、および兄弟タスクを含める",
	"Include Parent Tasks": "親タスクを含める",
	"Include Child Tasks": "子タスクを含める",
	"Include Sibling Tasks": "兄弟タスクを含める",
	"Advanced Filter": "高度なフィルター",
	"Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1'":
		"ブール演算を使用：AND、OR、NOT。例：'text content AND #tag1'",
	"Filter query": "フィルタークエリ",
	"Filter out tasks": "タスクをフィルタリング",
	"If enabled, tasks that match the query will be hidden, otherwise they will be shown":
		"有効にすると、クエリに一致するタスクは非表示になり、そうでなければ表示されます",
	Save: "保存",
	Cancel: "キャンセル",
	"Hide filter panel": "フィルターパネルを非表示",
	"Show filter panel": "フィルターパネルを表示",
	"Filter Tasks": "タスクをフィルター",
	"Preset filters": "プリセットフィルター",
	"Select a saved filter preset to apply":
		"適用する保存済みフィルタープリセットを選択",
	"Select a preset...": "プリセットを選択...",
	Query: "クエリ",
	"Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1 AND DATE:<2022-01-02 NOT PRIORITY:>=#B' - Supports >, <, =, >=, <=, != for PRIORITY and DATE.":
		"ブール演算を使用：AND、OR、NOT。例：'text content AND #tag1 AND DATE:<2022-01-02 NOT PRIORITY:>=#B' - PRIORITYとDATEには >、<、=、>=、<=、!= をサポートします。",
	"If true, tasks that match the query will be hidden, otherwise they will be shown":
		"trueの場合、クエリに一致するタスクは非表示になり、そうでなければ表示されます",
	Completed: "完了",
	"In Progress": "進行中",
	Abandoned: "放棄",
	"Not Started": "未開始",
	Planned: "計画済み",
	"Include Related Tasks": "関連タスクを含める",
	"Parent Tasks": "親タスク",
	"Child Tasks": "子タスク",
	"Sibling Tasks": "兄弟タスク",
	Apply: "適用",
	"New Preset": "新しいプリセット",
	"Preset saved": "プリセットを保存しました",
	"No changes to save": "保存する変更はありません",
	Close: "閉じる",
	"Capture to": "キャプチャ先",
	Capture: "キャプチャ",
	"Capture thoughts, tasks, or ideas...":
		"考え、タスク、アイデアをキャプチャ...",
	Tomorrow: "明日",
	"In 2 days": "2日後",
	"In 3 days": "3日後",
	"In 5 days": "5日後",
	"In 1 week": "1週間後",
	"In 10 days": "10日後",
	"In 2 weeks": "2週間後",
	"In 1 month": "1ヶ月後",
	"In 2 months": "2ヶ月後",
	"In 3 months": "3ヶ月後",
	"In 6 months": "6ヶ月後",
	"In 1 year": "1年後",
	"In 5 years": "5年後",
	"In 10 years": "10年後",
	"Highest priority": "最高優先度",
	"High priority": "高優先度",
	"Medium priority": "中優先度",
	"No priority": "無優先度",
	"Low priority": "低優先度",
	"Lowest priority": "最低優先度",
	"Priority A": "優先度A",
	"Priority B": "優先度B",
	"Priority C": "優先度C",
	"Task Priority": "タスク優先度",
	"Remove Priority": "優先度を削除",
	"Cycle task status forward": "タスクステータスを前に循環",
	"Cycle task status backward": "タスクステータスを後ろに循環",
	"Remove priority": "優先度を削除",
	"Move task to another file": "タスクを別のファイルに移動",
	"Move all completed subtasks to another file":
		"すべての完了したサブタスクを別のファイルに移動",
	"Move direct completed subtasks to another file":
		"直接完了したサブタスクを別のファイルに移動",
	"Move all subtasks to another file":
		"すべてのサブタスクを別のファイルに移動",
	"Set priority": "優先度を設定",
	"Toggle quick capture panel": "クイックキャプチャパネルを切り替え",
	"Quick capture (Global)": "クイックキャプチャ（グローバル）",
	"Toggle task filter panel": "タスクフィルターパネルを切り替え",
};

export default translations;
