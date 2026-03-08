export interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<string>;
}

export const tools: Tool[] = [
  {
    name: 'get_current_time',
    description: 'Returns the current local date and time.',
    parameters: {
      type: 'object',
      properties: {},
    },
    async execute() {
      return new Date().toLocaleString();
    },
  },
];

export const getToolDefinitions = () => {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
};

export const executeTool = async (name: string, args: any) => {
  const tool = tools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return await tool.execute(args);
};
