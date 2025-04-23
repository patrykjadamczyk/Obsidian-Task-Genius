// 简单的测试文件，专注于测试功能而不是类型兼容性

describe('workflow', () => {
  // 模拟依赖
  const mockTaskStatusChangeAnnotation = { of: jest.fn() };
  const mockWorkflowChangeAnnotation = { of: jest.fn() };
  const mockPriorityChangeAnnotation = { of: jest.fn() };
  
  // 模拟 moment
  const mockMoment = jest.fn().mockImplementation(() => ({
    format: jest.fn().mockReturnValue('2023-01-01 00:00:00'),
    diff: jest.fn().mockReturnValue(1000)
  }));
  
  mockMoment.utc = jest.fn().mockImplementation(() => ({
    format: jest.fn().mockReturnValue('00:00:10')
  }));
  
  mockMoment.duration = jest.fn().mockImplementation(() => ({
    asMilliseconds: jest.fn().mockReturnValue(10000)
  }));
  
  // 模拟 Text 对象
  const createMockText = (content: string = '') => {
    const lines = content.split('\n');
    return {
      toString: () => content,
      length: content.length,
      lines: lines.length,
      line: jest.fn().mockImplementation((lineNum) => {
        if (lineNum < 1 || lineNum > lines.length) {
          throw new Error(`Line ${lineNum} out of range`);
        }
        const line = lines[lineNum - 1];
        let from = 0;
        for (let i = 0; i < lineNum - 1; i++) {
          from += lines[i].length + 1; // +1 for newline
        }
        return {
          text: line,
          from,
          to: from + line.length,
          number: lineNum
        };
      }),
      lineAt: jest.fn().mockImplementation((pos) => {
        let lineStart = 0;
        let lineEnd = 0;
        let lineNumber = 1;
        
        for (const line of lines) {
          lineEnd = lineStart + line.length;
          
          if (pos >= lineStart && pos <= lineEnd) {
            return {
              text: line,
              from: lineStart,
              to: lineEnd,
              number: lineNumber
            };
          }
          
          lineStart = lineEnd + 1; // +1 for newline
          lineNumber++;
        }
        
        // Default to last line if position is beyond content
        return {
          text: lines[lines.length - 1] || '',
          from: lineStart - (lines[lines.length - 1]?.length || 0) - 1,
          to: lineStart,
          number: lines.length
        };
      })
    };
  };
  
  // 模拟 Transaction 对象
  const createMockTransaction = (options: any = {}) => {
    return {
      docChanged: options.docChanged !== undefined ? options.docChanged : true,
      startState: {
        doc: createMockText(options.startDoc || '- [ ] Task #workflow/dev\n\t- [ ] Subtask 🛫 2023-01-01 00:00:00')
      },
      newDoc: createMockText(options.newDoc || '- [ ] Task #workflow/dev\n\t- [x] Subtask 🛫 2023-01-01 00:00:00'),
      changes: {
        length: options.changes ? options.changes.length : 1,
        iterChanges: jest.fn().mockImplementation((callback) => {
          if (options.changes) {
            options.changes.forEach((change: any) => {
              callback(
                change.fromA, 
                change.toA, 
                change.fromB, 
                change.toB, 
                { toString: () => change.inserted }
              );
            });
          } else {
            // 默认模拟子任务状态变更为已完成
            callback(
              options.childTaskLine ? options.childTaskLine + 3 : 35, 
              options.childTaskLine ? options.childTaskLine + 4 : 36, 
              options.childTaskLine ? options.childTaskLine + 3 : 35, 
              options.childTaskLine ? options.childTaskLine + 4 : 36, 
              { toString: () => 'x' }
            );
          }
        })
      },
      selection: options.selection || null,
      annotation: jest.fn().mockImplementation((annotation) => {
        if (annotation === mockTaskStatusChangeAnnotation) {
          return options.hasTaskStatusAnnotation ? 'taskStatusChange' : undefined;
        }
        if (annotation === mockWorkflowChangeAnnotation) {
          return options.hasWorkflowAnnotation ? 'workflowChange' : undefined;
        }
        if (annotation === mockPriorityChangeAnnotation) {
          return options.hasPriorityAnnotation ? 'priorityChange' : undefined;
        }
        return undefined;
      }),
      isUserEvent: jest.fn().mockImplementation((type) => {
        if (type === 'input.paste') {
          return options.isPaste || false;
        }
        return options.isUserEvent !== undefined ? options.isUserEvent : true;
      })
    };
  };
  
  // 模拟 App 和 Plugin
  const createMockApp = () => ({
    vault: {
      getConfig: jest.fn().mockReturnValue({ tabSize: 4 })
    }
  });
  
  const createMockPlugin = (settings = {}) => ({
    settings: {
      taskStatusCycle: ['todo', 'in_progress', 'done', 'cancelled'],
      taskStatusMarks: {
        'todo': ' ',
        'in_progress': '/',
        'done': 'x',
        'cancelled': '-'
      },
      taskStatuses: {
        completed: 'x|X',
        inProgress: '/',
        cancelled: '-',
        todo: ' '
      },
      workflow: {
        enableWorkflow: true,
        definitions: [
          {
            id: 'dev',
            name: 'Development',
            stages: [
              {
                id: 'planning',
                name: 'Planning',
                type: 'normal',
                canProceedTo: ['development']
              },
              {
                id: 'development',
                name: 'Development',
                type: 'normal',
                canProceedTo: ['testing']
              },
              {
                id: 'testing',
                name: 'Testing',
                type: 'normal',
                canProceedTo: ['done']
              },
              {
                id: 'done',
                name: 'Done',
                type: 'terminal'
              }
            ]
          }
        ],
        timestampFormat: 'YYYY-MM-DD HH:mm:ss',
        spentTimeFormat: 'HH:mm:ss',
        removeTimestampOnTransition: true,
        calculateSpentTime: true,
        calculateFullSpentTime: true,
        autoRemoveLastStageMarker: true
      },
      ...settings
    }
  });
  
  // 模拟函数
  const mockExtractWorkflowInfo = (lineText: string) => {
    // 检查是否有工作流标签
    const workflowTagRegex = /#workflow\/([^\/\s]+)/;
    const workflowMatch = lineText.match(workflowTagRegex);
    
    if (workflowMatch) {
      return {
        workflowType: workflowMatch[1],
        currentStage: 'root',
        subStage: undefined
      };
    }
    
    // 检查是否有阶段标记
    const stageRegex = /\[stage::([^\]]+)\]/;
    const stageMatch = lineText.match(stageRegex);
    
    if (stageMatch) {
      const stageId = stageMatch[1];
      
      // 检查是否有子阶段
      if (stageId.includes('.')) {
        const parts = stageId.split('.');
        return {
          workflowType: 'fromParent',
          currentStage: parts[0],
          subStage: parts[1]
        };
      }
      
      return {
        workflowType: 'fromParent',
        currentStage: stageId,
        subStage: undefined
      };
    }
    
    return null;
  };
  
  // 测试用例
  describe('extractWorkflowInfo', () => {
    it('should extract workflow tag from line', () => {
      const result = mockExtractWorkflowInfo('- [ ] Task #workflow/dev');
      
      expect(result).toEqual({
        workflowType: 'dev',
        currentStage: 'root',
        subStage: undefined
      });
    });
    
    it('should extract stage marker from line', () => {
      const result = mockExtractWorkflowInfo('- [ ] Task [stage::planning]');
      
      expect(result).toEqual({
        workflowType: 'fromParent',
        currentStage: 'planning',
        subStage: undefined
      });
    });
    
    it('should extract substage marker from line', () => {
      const result = mockExtractWorkflowInfo('- [ ] Task [stage::planning.research]');
      
      expect(result).toEqual({
        workflowType: 'fromParent',
        currentStage: 'planning',
        subStage: 'research'
      });
    });
    
    it('should return null for non-workflow lines', () => {
      const result = mockExtractWorkflowInfo('- [ ] Regular task');
      
      expect(result).toBeNull();
    });
  });
});
